extends Node2D

const CutoutPiece = preload("res://cutout_piece.gd")
const FRAME_COUNT := 120
const FPS := 30
const OUTPUT_SIZE := Vector2i(1920, 1080)

const KEYFRAMES := [
	{"frame": 0, "hip_y": 0.0, "torso": -2.0, "head": -5.0, "ear_l": -8.0, "ear_r": 8.0, "arm_l": 10.0, "forearm_l": -8.0, "arm_r": -8.0, "forearm_r": 8.0, "thigh_l": -6.0, "shin_l": 10.0, "foot_l": -4.0, "thigh_r": 6.0, "shin_r": -10.0, "foot_r": 4.0, "tail": 8.0},
	{"frame": 15, "hip_y": 9.0, "torso": 3.0, "head": 3.0, "ear_l": -14.0, "ear_r": 14.0, "arm_l": 14.0, "forearm_l": -12.0, "arm_r": -12.0, "forearm_r": 12.0, "thigh_l": -12.0, "shin_l": 22.0, "foot_l": -8.0, "thigh_r": 12.0, "shin_r": -22.0, "foot_r": 8.0, "tail": 17.0},
	{"frame": 27, "hip_y": 0.0, "torso": -3.0, "head": -7.0, "ear_l": -4.0, "ear_r": 4.0, "arm_l": 5.0, "forearm_l": -4.0, "arm_r": -5.0, "forearm_r": 4.0, "thigh_l": -4.0, "shin_l": 7.0, "foot_l": -3.0, "thigh_r": 4.0, "shin_r": -7.0, "foot_r": 3.0, "tail": 2.0},
	{"frame": 41, "hip_y": -2.0, "torso": 2.0, "head": 5.0, "ear_l": -18.0, "ear_r": 12.0, "arm_l": -6.0, "forearm_l": 16.0, "arm_r": 12.0, "forearm_r": -14.0, "thigh_l": -30.0, "shin_l": 55.0, "foot_l": -24.0, "thigh_r": 8.0, "shin_r": -15.0, "foot_r": 7.0, "tail": 22.0},
	{"frame": 52, "hip_y": 2.0, "torso": -4.0, "head": -4.0, "ear_l": -6.0, "ear_r": 6.0, "arm_l": 8.0, "forearm_l": -8.0, "arm_r": -18.0, "forearm_r": 12.0, "thigh_l": 12.0, "shin_l": -18.0, "foot_l": 6.0, "thigh_r": -4.0, "shin_r": 9.0, "foot_r": -4.0, "tail": 7.0},
	{"frame": 63, "hip_y": 0.0, "torso": -7.0, "head": 8.0, "ear_l": -2.0, "ear_r": 16.0, "arm_l": 14.0, "forearm_l": -14.0, "arm_r": -55.0, "forearm_r": -18.0, "thigh_l": 5.0, "shin_l": -8.0, "foot_l": 3.0, "thigh_r": -5.0, "shin_r": 8.0, "foot_r": -3.0, "tail": -8.0},
	{"frame": 78, "hip_y": 0.0, "torso": -10.0, "head": 13.0, "ear_l": 5.0, "ear_r": 22.0, "arm_l": 18.0, "forearm_l": -18.0, "arm_r": -88.0, "forearm_r": -8.0, "thigh_l": 6.0, "shin_l": -10.0, "foot_l": 4.0, "thigh_r": -6.0, "shin_r": 10.0, "foot_r": -4.0, "tail": -16.0},
	{"frame": 88, "hip_y": 7.0, "torso": 8.0, "head": -18.0, "ear_l": -28.0, "ear_r": -12.0, "arm_l": 38.0, "forearm_l": -25.0, "arm_r": -28.0, "forearm_r": 38.0, "thigh_l": -13.0, "shin_l": 24.0, "foot_l": -10.0, "thigh_r": 13.0, "shin_r": -24.0, "foot_r": 10.0, "tail": 29.0},
	{"frame": 101, "hip_y": 1.0, "torso": -3.0, "head": 8.0, "ear_l": -5.0, "ear_r": 11.0, "arm_l": 15.0, "forearm_l": -14.0, "arm_r": -58.0, "forearm_r": 14.0, "thigh_l": -3.0, "shin_l": 6.0, "foot_l": -3.0, "thigh_r": 3.0, "shin_r": -6.0, "foot_r": 3.0, "tail": 8.0},
	{"frame": 107, "hip_y": 0.0, "torso": -2.0, "head": 6.0, "ear_l": -4.0, "ear_r": 9.0, "arm_l": 13.0, "forearm_l": -12.0, "arm_r": -55.0, "forearm_r": 13.0, "thigh_l": -2.0, "shin_l": 4.0, "foot_l": -2.0, "thigh_r": 2.0, "shin_r": -4.0, "foot_r": 2.0, "tail": 6.0},
	{"frame": 119, "hip_y": 0.0, "torso": -2.0, "head": 6.0, "ear_l": -4.0, "ear_r": 9.0, "arm_l": 13.0, "forearm_l": -12.0, "arm_r": -55.0, "forearm_r": 13.0, "thigh_l": -2.0, "shin_l": 4.0, "foot_l": -2.0, "thigh_r": 2.0, "shin_r": -4.0, "foot_r": 2.0, "tail": 6.0}
]

@onready var skeleton: Skeleton2D = $Skeleton2D

var bones: Dictionary = {}
var hip_rest_position := Vector2.ZERO


func _ready() -> void:
	if not get_viewport() is SubViewport:
		push_error("E0 requires capture from a transparent SubViewport")
		get_tree().quit(2)
		return
	get_viewport().transparent_bg = true
	RenderingServer.set_default_clear_color(Color(0.0, 0.0, 0.0, 0.0))
	_register_bones()
	_build_cutout()
	call_deferred("_render_sequence")


func _add_shadow() -> void:
	var shadow = CutoutPiece.new()
	shadow.configure("shadow", -20)
	shadow.position = Vector2(960, 851)
	add_child(shadow)


func _register_bones() -> void:
	for child in skeleton.get_children():
		_register_bone_branch(child)
	hip_rest_position = bones["Hip"].position
	if skeleton.get_bone_count() != 18:
		push_error("Expected 18 Bone2D nodes, found %d" % skeleton.get_bone_count())
		get_tree().quit(2)


func _register_bone_branch(node: Node) -> void:
	if node is Bone2D:
		bones[node.name] = node
	for child in node.get_children():
		_register_bone_branch(child)


func _build_cutout() -> void:
	_add_shadow()
	_add_piece(bones["Hip"], "pelvis", 2)
	_add_piece(bones["Tail"], "tail", -5)
	_add_piece(bones["Torso"], "torso", 5)
	_add_piece(bones["Head"], "head", 8)
	_add_piece(bones["EarLeft"], "ear_left", -1)
	_add_piece(bones["EarRight"], "ear_right", -1)
	_add_piece(bones["UpperArmLeft"], "upper_arm", 1)
	_add_piece(bones["LowerArmLeft"], "lower_arm", 1)
	_add_piece(bones["HandLeft"], "hand", 2)
	_add_piece(bones["UpperArmRight"], "upper_arm", 6)
	_add_piece(bones["LowerArmRight"], "lower_arm", 6)
	_add_piece(bones["HandRight"], "hand", 7)
	_add_piece(bones["ThighLeft"], "thigh", -2)
	_add_piece(bones["ShinLeft"], "shin", -2)
	_add_piece(bones["FootLeft"], "foot_left", 0)
	_add_piece(bones["ThighRight"], "thigh", 1)
	_add_piece(bones["ShinRight"], "shin", 1)
	_add_piece(bones["FootRight"], "foot_right", 3)
	_add_engine_spike_label()


func _add_piece(parent: Node2D, piece_kind: String, layer: int) -> void:
	var piece = CutoutPiece.new()
	piece.name = "%sPaper" % piece_kind.to_pascal_case()
	piece.configure(piece_kind, layer)
	parent.add_child(piece)


func _add_engine_spike_label() -> void:
	var label := Label.new()
	label.name = "EngineSpikeLabel"
	label.text = "ENGINE\nSPIKE"
	label.position = Vector2(-48, -10)
	label.size = Vector2(96, 50)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", Color("#29323a"))
	label.add_theme_constant_override("line_spacing", -3)
	label.z_index = 9
	bones["Torso"].add_child(label)


func _render_sequence() -> void:
	var output_dir := _output_directory()
	var absolute_output := ProjectSettings.globalize_path(output_dir)
	var make_error := DirAccess.make_dir_recursive_absolute(absolute_output)
	if make_error != OK:
		push_error("Could not create output directory: %s" % absolute_output)
		get_tree().quit(3)
		return

	for frame in range(FRAME_COUNT):
		_apply_pose(frame)
		await RenderingServer.frame_post_draw
		var image := get_viewport().get_texture().get_image()
		if image.get_size() != OUTPUT_SIZE:
			push_error("Unexpected frame size %s at frame %d" % [image.get_size(), frame])
			get_tree().quit(4)
			return
		var output_file := output_dir.path_join("frame-%04d.png" % frame)
		var save_error := image.save_png(output_file)
		if save_error != OK:
			push_error("Could not save %s (error %d)" % [output_file, save_error])
			get_tree().quit(5)
			return

	print("E0_RENDER_COMPLETE frames=%d fps=%d bones=%d output=%s" % [FRAME_COUNT, FPS, skeleton.get_bone_count(), absolute_output])
	get_tree().quit()


func _output_directory() -> String:
	var args := OS.get_cmdline_user_args()
	for index in range(args.size() - 1):
		if args[index] == "--output":
			return args[index + 1]
	return "res://../artifacts/frame-run-a"


func _apply_pose(frame: int) -> void:
	bones["Hip"].position = hip_rest_position + Vector2(0.0, _sample("hip_y", frame))
	_set_rotation("Torso", _sample("torso", frame))
	_set_rotation("Head", _sample("head", frame))
	_set_rotation("EarLeft", _sample("ear_l", frame))
	_set_rotation("EarRight", _sample("ear_r", frame))
	_set_rotation("UpperArmLeft", _sample("arm_l", frame))
	_set_rotation("LowerArmLeft", _sample("forearm_l", frame))
	_set_rotation("UpperArmRight", _sample("arm_r", frame))
	_set_rotation("LowerArmRight", _sample("forearm_r", frame))
	_set_rotation("ThighLeft", _sample("thigh_l", frame))
	_set_rotation("ShinLeft", _sample("shin_l", frame))
	_set_rotation("FootLeft", _sample("foot_l", frame))
	_set_rotation("ThighRight", _sample("thigh_r", frame))
	_set_rotation("ShinRight", _sample("shin_r", frame))
	_set_rotation("FootRight", _sample("foot_r", frame))
	_set_rotation("Tail", _sample("tail", frame))


func _set_rotation(bone_name: String, degrees: float) -> void:
	bones[bone_name].rotation = deg_to_rad(degrees)


func _sample(property_name: String, frame: int) -> float:
	for index in range(KEYFRAMES.size() - 1):
		var left: Dictionary = KEYFRAMES[index]
		var right: Dictionary = KEYFRAMES[index + 1]
		if frame <= int(right["frame"]):
			var span := float(int(right["frame"]) - int(left["frame"]))
			var amount := clampf((float(frame) - float(left["frame"])) / span, 0.0, 1.0)
			var eased := amount * amount * (3.0 - 2.0 * amount)
			return lerpf(float(left[property_name]), float(right[property_name]), eased)
	return float(KEYFRAMES[-1][property_name])
