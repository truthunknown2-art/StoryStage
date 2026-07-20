extends SceneTree

const FRAME_COUNT := 120
const EXPECTED_SIZE := Vector2i(1920, 1080)


func _init() -> void:
	var options := _parse_options(OS.get_cmdline_user_args())
	for required in ["run-a", "run-b", "output"]:
		if not options.has(required):
			push_error("Missing --%s" % required)
			quit(2)
			return

	var run_a := ProjectSettings.globalize_path(options["run-a"])
	var run_b := ProjectSettings.globalize_path(options["run-b"])
	var report_path := ProjectSettings.globalize_path(options["output"])
	var frames: Array[Dictionary] = []
	var mismatches: Array[Dictionary] = []
	var failures: Array[String] = []
	var aggregate := HashingContext.new()
	aggregate.start(HashingContext.HASH_SHA256)

	for frame in range(FRAME_COUNT):
		var file_name := "frame-%04d.png" % frame
		var path_a := run_a.path_join(file_name)
		var path_b := run_b.path_join(file_name)
		if not FileAccess.file_exists(path_a) or not FileAccess.file_exists(path_b):
			failures.append("Missing corresponding frame %s" % file_name)
			continue

		var hash_a := FileAccess.get_sha256(path_a)
		var hash_b := FileAccess.get_sha256(path_b)
		aggregate.update(hash_a.hex_decode())
		if hash_a != hash_b:
			mismatches.append({"frame": frame, "runA": hash_a, "runB": hash_b})

		var image := Image.load_from_file(path_a)
		if image.is_empty():
			failures.append("Could not decode %s" % path_a)
			continue
		if image.get_size() != EXPECTED_SIZE:
			failures.append("%s has size %s" % [file_name, image.get_size()])
		if image.get_format() != Image.FORMAT_RGBA8:
			failures.append("%s is not RGBA8 (format %d)" % [file_name, image.get_format()])

		var alpha_mode := image.detect_alpha()
		if alpha_mode == Image.ALPHA_NONE:
			failures.append("%s does not use transparency" % file_name)
		var used := image.get_used_rect()
		if used.size.x <= 0 or used.size.y <= 0:
			failures.append("%s has no visible pixels" % file_name)
		if used.position.x <= 0 or used.position.y <= 0 or used.end.x >= EXPECTED_SIZE.x or used.end.y >= EXPECTED_SIZE.y:
			failures.append("%s visible content touches the frame edge: %s" % [file_name, used])

		frames.append({
			"frame": frame,
			"sha256": hash_a,
			"width": image.get_width(),
			"height": image.get_height(),
			"format": "RGBA8",
			"alphaMode": _alpha_mode_name(alpha_mode),
			"usedRect": {"x": used.position.x, "y": used.position.y, "width": used.size.x, "height": used.size.y}
		})

	var run_a_count := _frame_count(run_a)
	var run_b_count := _frame_count(run_b)
	if run_a_count != FRAME_COUNT:
		failures.append("Run A has %d PNG frames, expected %d" % [run_a_count, FRAME_COUNT])
	if run_b_count != FRAME_COUNT:
		failures.append("Run B has %d PNG frames, expected %d" % [run_b_count, FRAME_COUNT])

	var report := {
		"schemaVersion": "1.0",
		"frameCountExpected": FRAME_COUNT,
		"runAFrameCount": run_a_count,
		"runBFrameCount": run_b_count,
		"width": EXPECTED_SIZE.x,
		"height": EXPECTED_SIZE.y,
		"fps": 30,
		"transparentRgbaVerified": failures.filter(func(message: String): return "transparen" in message or "RGBA8" in message).is_empty(),
		"deterministic": mismatches.is_empty() and run_a_count == FRAME_COUNT and run_b_count == FRAME_COUNT,
		"mismatches": mismatches,
		"failures": failures,
		"aggregateFrameSha256": aggregate.finish().hex_encode(),
		"frames": frames
	}

	DirAccess.make_dir_recursive_absolute(report_path.get_base_dir())
	var output := FileAccess.open(report_path, FileAccess.WRITE)
	if output == null:
		push_error("Could not write %s" % report_path)
		quit(3)
		return
	output.store_string(JSON.stringify(report, "  ") + "\n")
	output.close()

	if not failures.is_empty() or not mismatches.is_empty():
		push_error("E0 frame verification failed: %d failures, %d mismatches" % [failures.size(), mismatches.size()])
		quit(1)
		return
	print("E0_FRAMES_VERIFIED count=%d size=1920x1080 rgba=true deterministic=true aggregate=%s" % [FRAME_COUNT, report["aggregateFrameSha256"]])
	quit()


func _parse_options(args: PackedStringArray) -> Dictionary:
	var options := {}
	var index := 0
	while index < args.size() - 1:
		if args[index].begins_with("--"):
			options[args[index].trim_prefix("--")] = args[index + 1]
			index += 2
		else:
			index += 1
	return options


func _frame_count(directory: String) -> int:
	var count := 0
	for file_name in DirAccess.get_files_at(directory):
		if file_name.begins_with("frame-") and file_name.ends_with(".png"):
			count += 1
	return count


func _alpha_mode_name(alpha_mode: Image.AlphaMode) -> String:
	match alpha_mode:
		Image.ALPHA_NONE:
			return "none"
		Image.ALPHA_BIT:
			return "bit"
		Image.ALPHA_BLEND:
			return "blend"
		_:
			return "unknown"
