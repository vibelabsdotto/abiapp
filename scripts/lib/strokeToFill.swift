// Outlines stroked path data with CoreGraphics (macOS): the result, filled
// with the nonzero rule, draws exactly what the stroke draws. Used for
// toolbar icons, whose loader (@expo/ui ImageLoader) fills paths only.
//
//   swift scripts/lib/strokeToFill.swift <strokeWidth> < absolute-path-data
// Input: one path per line, absolute commands M/L/C/Q/Z only.
// Output: one filled outline path per input line.

import CoreGraphics
import Foundation

let width = CGFloat(Double(CommandLine.arguments[1]) ?? 2)

func fmt(_ v: CGFloat) -> String {
  let r = (Double(v) * 1000).rounded() / 1000
  return r == r.rounded() ? String(Int(r)) : String(r)
}

while let line = readLine() {
  let tokens = line.split(whereSeparator: { $0 == " " || $0 == "," }).map(String.init)
  let path = CGMutablePath()
  var i = 0
  var cmd = ""
  func num() -> CGFloat { defer { i += 1 }; return CGFloat(Double(tokens[i])!) }
  while i < tokens.count {
    if let c = tokens[i].first, c.isLetter { cmd = tokens[i]; i += 1 }
    switch cmd {
    case "M": path.move(to: CGPoint(x: num(), y: num()))
    case "L": path.addLine(to: CGPoint(x: num(), y: num()))
    case "C":
      let c1 = CGPoint(x: num(), y: num()), c2 = CGPoint(x: num(), y: num())
      path.addCurve(to: CGPoint(x: num(), y: num()), control1: c1, control2: c2)
    case "Q":
      let c1 = CGPoint(x: num(), y: num())
      path.addQuadCurve(to: CGPoint(x: num(), y: num()), control: c1)
    case "Z": path.closeSubpath()
    default: fatalError("unsupported command \(cmd)")
    }
  }
  let outline = path.copy(strokingWithWidth: width, lineCap: .round, lineJoin: .round, miterLimit: 10)
  var out: [String] = []
  outline.applyWithBlock { el in
    let p = el.pointee.points
    switch el.pointee.type {
    case .moveToPoint: out.append("M\(fmt(p[0].x)) \(fmt(p[0].y))")
    case .addLineToPoint: out.append("L\(fmt(p[0].x)) \(fmt(p[0].y))")
    case .addQuadCurveToPoint: out.append("Q\(fmt(p[0].x)) \(fmt(p[0].y)) \(fmt(p[1].x)) \(fmt(p[1].y))")
    case .addCurveToPoint: out.append("C\(fmt(p[0].x)) \(fmt(p[0].y)) \(fmt(p[1].x)) \(fmt(p[1].y)) \(fmt(p[2].x)) \(fmt(p[2].y))")
    case .closeSubpath: out.append("Z")
    @unknown default: break
    }
  }
  print(out.joined(separator: " "))
}
