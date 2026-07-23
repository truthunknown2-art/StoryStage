extends Node2D

const INK := Color("#29323a")
const PAPER_CREAM := Color("#f4cf83")
const PAPER_CORAL := Color("#d66c55")
const PAPER_TEAL := Color("#4e9d92")
const PAPER_BLUE := Color("#5d78a8")
const PAPER_LIGHT := Color("#fff4d6")

var kind := ""


func configure(piece_kind: String, layer: int) -> void:
	kind = piece_kind
	z_index = layer
	queue_redraw()


func _draw() -> void:
	match kind:
		"shadow":
			_polygon([Vector2(-112, -12), Vector2(112, -12), Vector2(128, 0), Vector2(112, 12), Vector2(-112, 12), Vector2(-128, 0)], Color(0.11, 0.14, 0.16, 0.28), Color(0.11, 0.14, 0.16, 0.0), 0.0)
		"pelvis":
			_polygon([Vector2(-61, -34), Vector2(61, -34), Vector2(54, 45), Vector2(-54, 45)], PAPER_BLUE)
			_brad(Vector2(-38, 20))
			_brad(Vector2(38, 20))
		"torso":
			_polygon([Vector2(-72, -72), Vector2(72, -72), Vector2(60, 70), Vector2(-60, 70)], PAPER_CORAL)
			_polygon([Vector2(-54, -14), Vector2(54, -14), Vector2(54, 42), Vector2(-54, 42)], PAPER_LIGHT, INK, 3.0)
			_speckles([Vector2(-48, -55), Vector2(39, -47), Vector2(-31, 54), Vector2(46, 57)])
		"head":
			_polygon([Vector2(-66, -54), Vector2(-82, -10), Vector2(-70, 50), Vector2(0, 78), Vector2(70, 50), Vector2(82, -10), Vector2(66, -54), Vector2(0, -75)], PAPER_CREAM)
			draw_circle(Vector2(-27, -8), 15.0, PAPER_LIGHT)
			draw_circle(Vector2(27, -8), 15.0, PAPER_LIGHT)
			draw_circle(Vector2(-23, -6), 6.0, INK)
			draw_circle(Vector2(31, -6), 6.0, INK)
			_polygon([Vector2(-18, 28), Vector2(18, 28), Vector2(0, 42)], PAPER_CORAL, INK, 2.5)
			_speckles([Vector2(-51, 26), Vector2(47, 17), Vector2(2, -55)])
		"ear_left", "ear_right":
			_polygon([Vector2(-20, 8), Vector2(-13, -55), Vector2(10, -68), Vector2(23, -42), Vector2(18, 15)], PAPER_TEAL)
			_polygon([Vector2(-8, -2), Vector2(-5, -44), Vector2(7, -52), Vector2(11, -8)], PAPER_CORAL, PAPER_CORAL, 1.0)
		"upper_arm", "thigh":
			_limb(100.0, 24.0, PAPER_TEAL)
		"lower_arm":
			_limb(88.0, 21.0, PAPER_CREAM)
		"shin":
			_limb(108.0, 24.0, PAPER_CREAM)
		"hand":
			draw_circle(Vector2(0, 15), 25.0, PAPER_CREAM)
			draw_arc(Vector2(0, 15), 25.0, 0.0, TAU, 28, INK, 4.0, true)
			_brad(Vector2.ZERO)
		"foot_left":
			_polygon([Vector2(-24, -12), Vector2(8, -17), Vector2(58, 4), Vector2(52, 26), Vector2(-25, 25)], PAPER_BLUE)
			_brad(Vector2.ZERO)
		"foot_right":
			_polygon([Vector2(24, -12), Vector2(-8, -17), Vector2(-58, 4), Vector2(-52, 26), Vector2(25, 25)], PAPER_BLUE)
			_brad(Vector2.ZERO)
		"tail":
			_polygon([Vector2(-4, -19), Vector2(-54, -38), Vector2(-111, -26), Vector2(-134, 2), Vector2(-102, 9), Vector2(-51, -3), Vector2(4, 18)], PAPER_TEAL)
			_brad(Vector2.ZERO)


func _limb(length: float, half_width: float, color: Color) -> void:
	_polygon([Vector2(-half_width, 0), Vector2(half_width, 0), Vector2(half_width - 4.0, length), Vector2(-half_width + 4.0, length)], color)
	_brad(Vector2.ZERO)


func _brad(at: Vector2) -> void:
	draw_circle(at, 8.0, Color("#f4b84d"))
	draw_arc(at, 8.0, 0.0, TAU, 20, INK, 2.0, true)


func _speckles(points: Array[Vector2]) -> void:
	for point in points:
		draw_circle(point, 4.0, Color(1.0, 1.0, 1.0, 0.22))


func _polygon(points: Array[Vector2], fill: Color, stroke: Color = INK, width: float = 4.0) -> void:
	var packed := PackedVector2Array(points)
	draw_colored_polygon(packed, fill)
	if width > 0.0:
		var outline := PackedVector2Array(points)
		outline.append(points[0])
		draw_polyline(outline, stroke, width, true)
