// Draws "1 [icons]  2 [icons] ..." into a PNG for the SwiftBar title.
// usage: osascript -l JavaScript .render-bar.js OUT.png dark|light @1 com.app.id ... @*2 com.other.id ...
// "@name" starts a workspace, "@*name" marks the focused one; other args are bundle ids.
ObjC.import('AppKit');
ObjC.import('CoreImage');

// Grayscale copy of an app icon, rendered at px pixels.
function mono(icon, px) {
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, px, px, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  icon.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, px, px), $.NSZeroRect, 2, 1);
  $.NSGraphicsContext.restoreGraphicsState;

  const filter = $.CIFilter.filterWithName('CIColorControls');
  filter.setValueForKey($.CIImage.alloc.initWithBitmapImageRep(rep), 'inputImage');
  filter.setValueForKey($(0), 'inputSaturation');
  filter.setValueForKey($(1.15), 'inputContrast');
  const img = $.NSImage.alloc.initWithSize($.NSMakeSize(px, px));
  img.addRepresentation($.NSCIImageRep.imageRepWithCIImage(filter.outputImage));
  return img;
}

function run(argv) {
  const [out, mode, ...tokens] = argv;
  const S = 2, H = 22, ICON = 16, PAD = 4, GAP = 8; // points; S = retina scale
  const ws = $.NSWorkspace.sharedWorkspace;
  const monoIcons = ObjC.unwrap($.NSProcessInfo.processInfo.environment.objectForKey('ICONS')) !== 'color';
  const color = mode === 'dark' ? $.NSColor.whiteColor : $.NSColor.blackColor;
  const attrs = $.NSMutableDictionary.dictionary;
  attrs.setObjectForKey($.NSFont.monospacedDigitSystemFontOfSizeWeight(13, 0.3), 'NSFont');
  attrs.setObjectForKey(color, 'NSColor');
  const shadow = $.NSShadow.alloc.init;
  shadow.shadowColor = $.NSColor.blackColor.colorWithAlphaComponent(0.5);
  shadow.shadowBlurRadius = 2;
  shadow.shadowOffset = $.NSMakeSize(0, -0.5);
  attrs.setObjectForKey(shadow, 'NSShadow');

  // Parse tokens into [{label, focused, icons: [NSImage]}]
  const groups = [];
  tokens.forEach(t => {
    if (t.startsWith('@')) {
      const focused = t.startsWith('@*');
      groups.push({ label: $(t.slice(focused ? 2 : 1)), focused, icons: [] });
    } else if (groups.length) {
      const url = ws.URLForApplicationWithBundleIdentifier(t);
      if (url.isNil()) return;
      const icon = ws.iconForFile(url.path);
      groups[groups.length - 1].icons.push(monoIcons ? mono(icon, ICON * S) : icon);
    }
  });

  // Measure
  groups.forEach(g => {
    g.textW = g.label.sizeWithAttributes(attrs).width;
    g.w = PAD + g.textW + g.icons.length * (ICON + 2) + PAD;
  });
  const W = Math.ceil(groups.reduce((s, g) => s + g.w, 0) + GAP * (groups.length - 1)) || 1;

  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, W * S, H * S, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  rep.size = $.NSMakeSize(W, H); // 144 dpi -> renders crisp at point size
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));

  let x = 0;
  groups.forEach(g => {
    if (g.focused) {
      color.colorWithAlphaComponent(0.3).setFill;
      $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius($.NSMakeRect(x, 1, g.w, H - 2), 5, 5).fill;
    }
    let cx = x + PAD;
    g.label.drawAtPointWithAttributes($.NSMakePoint(cx, (H - 16) / 2), attrs);
    cx += g.textW + 2;
    g.icons.forEach(icon => {
      icon.drawInRectFromRectOperationFraction($.NSMakeRect(cx, (H - ICON) / 2, ICON, ICON), $.NSZeroRect, 2, g.focused ? 1 : 0.75);
      cx += ICON + 2;
    });
    x += g.w + GAP;
  });

  $.NSGraphicsContext.restoreGraphicsState;
  rep.representationUsingTypeProperties(4, $()).writeToFileAtomically(out, true); // 4 = PNG
}
