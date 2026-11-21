'use strict';

const I18N = {
  en: {
    title: 'DXF Nester',
    lead: 'Fill a workpiece with as many copies of your designs as possible. Everything runs in your browser – no files are sent anywhere.',
    s1: 'Designs',
    dropMain: 'Drop DXF, STL or pattern (SVG/PNG) files here',
    dropSub: 'or click to choose. Multiple files are fine.',
    note1:
      'STL: you choose which face becomes the 2D design. DXF with several views (front/top/right): the layer with the largest extent is picked automatically.',
    s2: 'Workpiece',
    wLabel: 'Width (mm)',
    wTitle:
      'Size of the workpiece. It does not matter which side is width or height – parts may still be rotated if rotation is allowed.',
    wHelp: 'One side of the material.',
    hLabel: 'Height (mm)',
    hTitle: 'Size of the workpiece.',
    hHelp: 'The other side of the material.',
    gapLabel: 'Gap between parts (mm)',
    gapTitle:
      'Distance between parts. The cut (kerf) removes material and edges can get hot, so parts need some air.',
    gapHelp:
      'Space between neighbours so the kerf does not reach the next part. 1 mm is a safe start.',
    marginLabel: 'Margin to edge (mm)',
    marginTitle:
      'Distance between the outermost parts and the workpiece edge. 0 means parts may touch the edge.',
    marginHelp:
      'Free border around the workpiece, e.g. if the edge is damaged or the material is clamped. 0 = parts may touch the edge.',
    rotLabel: 'Allow 90° rotation',
    rotTitle: 'Allows parts to be turned on their side (rotated 90°) if that fits more pieces.',
    rotHelp:
      'Parts may be rotated 90° for better use of material. Turn off if the material has a grain or direction.',
    go: 'Fill the workpiece',
    calc: 'Calculating…',
    s3: 'Result',
    dDxf: 'Download DXF',
    dPdf: 'PDF (1:1)',
    pdfOpts: 'PDF settings:',
    pdfTitle:
      'Applies to the PDF file only. Many laser programs read line thickness as cut (very thin) or engrave (thicker).',
    pdfWLabel: 'Line width',
    pdfWTitle: 'Line width in the PDF. Enter the width your laser software treats as cutting.',
    pdfCLabel: 'Colour',
    pdfCTitle: 'Line colour in the PDF. Many laser programs sort or set power per colour.',
    pdfFLabel: 'Draw workpiece frame',
    pdfFTitle:
      'Draws the workpiece edge as a dashed line. Off by default, because the software may cut or engrave the frame. The PDF page already has the size of the workpiece.',
    note3:
      'Red lines = cut lines. The dashed frame is the workpiece and appears only in the preview and SVG, not in the DXF (in the PDF only if you tick the box). Holes are written before the outer contour in the file; make sure your laser software cuts inner shapes first.',
    footer:
      'The nesting is optimal among guillotine layouts and treats each design as its bounding rectangle. Includes three.js (MIT) for the 3D view.',
    closeAria: 'Close',
    unitLabel: 'Unit in the STL file',
    unitInch: 'inch',
    unitTitle:
      'The unit the model was drawn in. Most CAD programs export mm. Check that the size shown below is right.',
    tolLabel: 'Follow rounded edges out to:',
    tolTitle:
      'How far around rounded edges (fillets) the face may follow. The angle is measured between the face you clicked and the surface further out.',
    tolHelp:
      '<b>How the slider works:</b> <b>1°</b> = only the flat face you clicked. <b>89°</b> = the face may follow a rounded edge all the way out until it is vertical, so the outline gets the full width of the part. Vertical walls (and holes) are never included – they become the outline.',
    skip: 'Skip',
    dl: 'Save as DXF',
    use: 'Use as design',
    layer: 'Layer',
    layerTitle:
      'A DXF can contain several views or layers (e.g. front/top/right from CAD). Pick the layer that is the actual cutting design. The layer with the largest extent is picked automatically.',
    allLayers: '(all layers)',
    ignored: 'Ignored objects',
    noGeo: 'No geometry found in the selected layer.',
    contours: 'contours',
    contour1: 'contour',
    fromStl: 'from STL',
    useIt: 'Use',
    useTitle: 'Untick to keep the design in the list but not use it in the nesting.',
    remove: 'Remove',
    faceSuffix: '-face',
    unknownType: 'unknown file type (use .dxf, .stl, .svg or .png)',
    noGeometry: 'found no geometry',
    addFirst: 'Add at least one design first.',
    enterSize: 'Enter the workpiece size.',
    noFit: 'No part fits on the workpiece.',
    errPrefix: 'Error: ',
    stlIntro:
      'Model: {0} triangles. Click the flat face that should become the DXF. Drag to rotate, scroll to zoom, right-click and drag to pan.',
    stlSel:
      'Selected face: {0} × {1} mm (rotated to the smallest rectangle), {2} holes/openings. Click another face to change.',
    stlNone: 'The face gave no outline – try another face.',
    stlFail: 'Could not compute the face: ',
    cover: 'of the workpiece is covered ({0} parts)',
    pcs: 'pcs',
    notUsed: 'not used in this layout',
    filePrefix: 'nested_',
    locale: 'en-US',
    logBtn: 'Export log',
    logTitle:
      'Saves a .txt file with all input designs, the settings and every generated result – including which designs ended up in each layout.',
    privacy:
      'Anonymous visit counting without cookies (GoatCounter). Your files are never uploaded.',
    preferLabel: 'Prefer bigger parts:',
    preferOut: 'accept up to {0} % less coverage',
    preferTitle:
      'Choose bigger parts even if they cover less of the workpiece. 0 = only maximise the covered area. At 10, a layout with smaller parts is only chosen if it covers more than 10 % more area than the best layout with bigger parts.',
    preferHelp:
      'Higher = bigger parts but less material used. 0 = use as much of the material as possible with any mix of sizes. Move the slider to a level, then click the handle once more to generate it – each generated level gets a coloured dot and a proposal.',
    smallerCould:
      'With smaller parts up to {0} % could be covered – the slider chose bigger parts instead.',
    stale: 'Inputs changed – press "Fill the workpiece" again to update the proposals.',
    sameAs: 'same layout as {0} %',
    unusedN: '{0} other designs are not used in this layout.',
    partsN: '{0} parts',
    lvHint: '{0} % is not generated yet – click the slider handle once more to generate it.',
    stlAuto: 'Use + find same face on {0} more',
    stlAutoTitle:
      'Uses this face and looks for the same face (same direction, same relative position) on the remaining STL files, then adds them all as designs. Works when the models have the same orientation. Files where no match is found open for manual selection.',
    saveDxf: 'Save as DXF',
    zipAll: 'Save all STL designs as ZIP of DXF files',
    autoDone: 'Same face found automatically on all {1} files.',
    autoPart: 'Same face found on {0} of {1} files. {2} need manual selection – they open next.',
    engraveTitle: 'Engraving patterns (optional)',
    engraveNote:
      'Add pattern images from pattern.monster (SVG works best, PNG and JPG also work). With several patterns each part gets the next one in turn; with one pattern all parts get it. The engraving goes into the PDF only.',
    engraveRepeat: '{0} × {1} mm per repeat',
    engraveOpts: 'Engraving:',
    engOnLabel: 'Engrave patterns',
    engOnTitle:
      'Adds the pattern as a raster engraving inside every part in the PDF. The cut lines stay thin vector lines.',
    engDpiLabel: 'Resolution',
    engDpiTitle:
      'Engraving resolution in DPI. 600 is a good compromise between quality and engraving time. Very large parts are rendered at a lower resolution automatically.',
    engScaleLabel: 'Pattern scale',
    engScaleTitle:
      'Scales the pattern. 100 % = the size the pattern file was exported at (96 px per inch).',
    engInsetLabel: 'Edge margin',
    engInsetTitle:
      'Keeps this distance (mm) between the engraving and the cut line, so the edge is not burnt twice. 0 = engrave all the way to the edge.',
    engInvertLabel: 'Invert',
    engInvertTitle:
      'By default the less frequent tone of the pattern (usually the lines) is engraved. Tick to engrave the other tone.',
    engRendering: 'Rendering engraving… {0} / {1}',
    'e.ERR_PATTERN_LOAD': 'Could not read the pattern image.',
    'e.ERR_BINARY_DXF': 'Binary DXF is not supported – save as ASCII DXF.',
    'e.ERR_STL_PARSE': 'Could not read the STL file.',
  },
  sv: {
    title: 'DXF-nästlare',
    lead: 'Fyll ett arbetsstycke med så många kopior av dina mönster som möjligt. Allt körs i webbläsaren – inga filer skickas någonstans.',
    s1: 'Mönster',
    dropMain: 'Släpp DXF-, STL- eller mönsterfiler (SVG/PNG) här',
    dropSub: 'eller klicka för att välja. Flera filer går bra.',
    note1:
      'STL: du får välja vilken yta som ska bli 2D-mönster. DXF med flera vyer (front/top/right) – lagret med störst utsträckning väljs automatiskt.',
    s2: 'Arbetsstycke',
    wLabel: 'Bredd (mm)',
    wTitle:
      'Arbetsstyckets mått. Vilken sida som är bredd eller höjd spelar ingen roll – delarna får ändå vridas om rotation är tillåten.',
    wHelp: 'Materialbitens ena sida.',
    hLabel: 'Höjd (mm)',
    hTitle: 'Arbetsstyckets mått.',
    hHelp: 'Materialbitens andra sida.',
    gapLabel: 'Mellanrum mellan delar (mm)',
    gapTitle:
      'Avstånd mellan delarna. Skärspåret (kerf) tar bort material och kanterna kan bli varma, så delarna behöver lite luft.',
    gapHelp:
      'Luft mellan grannar så att skärspåret inte kommer åt nästa del. 1 mm är en säker start.',
    marginLabel: 'Marginal mot kant (mm)',
    marginTitle:
      'Avstånd mellan yttersta delarna och arbetsstyckets kant. 0 betyder att delar får ligga mot kanten.',
    marginHelp:
      'Fri kant runt hela arbetsstycket, t.ex. om kanten är skadad eller materialet spänns fast. 0 = delar får ligga mot kanten.',
    rotLabel: 'Tillåt 90° rotation',
    rotTitle: 'Tillåter att delar läggs på sidan (vrids 90°) om det ger fler bitar.',
    rotHelp:
      'Delar får vridas 90° om det ger bättre utnyttjande. Stäng av om materialet har ådring eller riktning.',
    go: 'Fyll arbetsstycket',
    calc: 'Räknar…',
    s3: 'Resultat',
    dDxf: 'Ladda ner DXF',
    dPdf: 'PDF (1:1)',
    pdfOpts: 'PDF-inställningar:',
    pdfTitle:
      'Gäller bara PDF-filen. Många laserprogram tolkar linjens tjocklek som skära (mycket tunn) eller gravera (tjockare).',
    pdfWLabel: 'Linjetjocklek',
    pdfWTitle:
      'Linjetjocklek i PDF-filen. Ange den tjocklek ditt laserprogram tolkar som skärning.',
    pdfCLabel: 'Färg',
    pdfCTitle:
      'Linjefärg i PDF-filen. Många laserprogram sorterar eller ställer in effekt per färg.',
    pdfFLabel: 'Rita arbetsstyckets ram',
    pdfFTitle:
      'Ritar arbetsstyckets kant som en streckad linje. Av som standard, eftersom programmet annars kan skära eller gravera ramen. PDF-sidan har redan arbetsstyckets storlek.',
    note3:
      'Rödstreck = skärlinjer. Den streckade ramen är arbetsstycket och finns bara i förhandsvisningen och SVG, inte i DXF-filen (i PDF bara om du kryssar i det). Hålen skrivs före ytterkonturen i filen; kontrollera att laserprogrammet skär innerformer först.',
    footer:
      'Nästlingen är optimal bland snitt-layouter (guillotine) och räknar varje mönster som sin omslutande rektangel. Innehåller three.js (MIT) för 3D-vyn.',
    closeAria: 'Stäng',
    unitLabel: 'Enhet i STL-filen',
    unitInch: 'tum',
    unitTitle:
      'Vilken enhet modellen är ritad i. De flesta CAD-program exporterar mm. Kontrollera att måtten som visas nedan stämmer.',
    tolLabel: 'Följ rundade kanter ut till:',
    tolTitle:
      'Hur långt runt rundade kanter (fillets) ytan får följa. Vinkeln mäts mellan ytan där du klickade och ytan längre ut.',
    tolHelp:
      '<b>Så fungerar reglaget:</b> <b>1°</b> = bara den plana ytan där du klickade. <b>89°</b> = ytan får följa en rundad kant hela vägen ut tills den blir lodrät, så att konturen får delens fulla bredd. Lodräta väggar (och hål) räknas aldrig med – de blir kontur.',
    skip: 'Hoppa över',
    dl: 'Spara som DXF',
    use: 'Använd som mönster',
    layer: 'Lager',
    layerTitle:
      'En DXF kan innehålla flera vyer eller lager (t.ex. front/top/right från CAD). Välj det lager som är själva skärmönstret. Lagret med störst utsträckning väljs automatiskt.',
    allLayers: '(alla lager)',
    ignored: 'Ignorerade objekt',
    noGeo: 'Hittade ingen geometri i valt lager.',
    contours: 'konturer',
    contour1: 'kontur',
    fromStl: 'från STL',
    useIt: 'Använd',
    useTitle: 'Avmarkera för att behålla mönstret i listan men inte använda det i nästlingen.',
    remove: 'Ta bort',
    faceSuffix: '-yta',
    unknownType: 'okänd filtyp (använd .dxf, .stl, .svg eller .png)',
    noGeometry: 'hittade ingen geometri',
    addFirst: 'Lägg till minst ett mönster först.',
    enterSize: 'Ange arbetsstyckets mått.',
    noFit: 'Ingen del får plats på arbetsstycket.',
    errPrefix: 'Fel: ',
    stlIntro:
      'Modell: {0} trianglar. Klicka på den plana yta som ska bli DXF. Dra för att rotera, scrolla för att zooma, högerklicka och dra för att panorera.',
    stlSel:
      'Vald yta: {0} × {1} mm (roterad till minsta rektangel), {2} hål/öppningar. Klicka på en annan yta för att byta.',
    stlNone: 'Ytan gav ingen kontur – prova en annan yta.',
    stlFail: 'Kunde inte räkna ut ytan: ',
    cover: 'av arbetsstycket täcks ({0} delar)',
    pcs: 'st',
    notUsed: 'används inte i denna layout',
    filePrefix: 'nastlad_',
    locale: 'sv-SE',
    logBtn: 'Exportera logg',
    logTitle:
      'Sparar en .txt-fil med alla inlästa mönster, inställningarna och varje genererat resultat – inklusive vilka mönster som hamnade i varje layout.',
    privacy: 'Anonym besöksräkning utan cookies (GoatCounter). Dina filer laddas aldrig upp.',
    preferLabel: 'Föredra större delar:',
    preferOut: 'acceptera upp till {0} % lägre täckning',
    preferTitle:
      'Välj större delar även om de täcker mindre av arbetsstycket. 0 = maximera bara den täckta ytan. Vid 10 väljs en layout med mindre delar bara om den täcker mer än 10 % mer yta än den bästa layouten med större delar.',
    preferHelp:
      'Högre = större delar men mindre utnyttjat material. 0 = utnyttja materialet så mycket som möjligt med valfri blandning av storlekar. Flytta reglaget till en nivå och klicka sedan på handtaget en gång till för att generera den – varje genererad nivå får en färgad prick och ett förslag.',
    smallerCould:
      'Med mindre delar hade upp till {0} % kunnat täckas – reglaget valde större delar i stället.',
    stale:
      'Inmatningen har ändrats – tryck på "Fyll arbetsstycket" igen för att uppdatera förslagen.',
    sameAs: 'samma layout som {0} %',
    unusedN: '{0} andra mönster används inte i den här layouten.',
    partsN: '{0} delar',
    lvHint:
      '{0} % är inte genererad än – klicka på reglagets handtag en gång till för att generera den.',
    stlAuto: 'Använd + hitta samma yta på {0} till',
    stlAutoTitle:
      'Använder den här ytan och letar upp samma yta (samma riktning, samma relativa läge) på de övriga STL-filerna, och lägger till alla som mönster. Fungerar när modellerna har samma orientering. Filer utan träff öppnas för manuellt val.',
    saveDxf: 'Spara som DXF',
    zipAll: 'Spara alla STL-mönster som ZIP med DXF-filer',
    autoDone: 'Samma yta hittades automatiskt på alla {1} filer.',
    autoPart:
      'Samma yta hittades på {0} av {1} filer. {2} behöver väljas manuellt – de öppnas härnäst.',
    engraveTitle: 'Gravyrmönster (valfritt)',
    engraveNote:
      'Lägg till mönsterbilder från pattern.monster (SVG fungerar bäst, PNG och JPG går också). Med flera mönster får varje del nästa mönster i tur och ordning; med ett mönster får alla delar det. Gravyren hamnar bara i PDF-filen.',
    engraveRepeat: '{0} × {1} mm per upprepning',
    engraveOpts: 'Gravyr:',
    engOnLabel: 'Gravera mönster',
    engOnTitle:
      'Lägger in mönstret som rastergravyr i varje del i PDF-filen. Skärlinjerna förblir tunna vektorlinjer.',
    engDpiLabel: 'Upplösning',
    engDpiTitle:
      'Gravyrens upplösning i DPI. 600 är en bra kompromiss mellan kvalitet och gravyrtid. Mycket stora delar renderas automatiskt med lägre upplösning.',
    engScaleLabel: 'Mönsterskala',
    engScaleTitle:
      'Skalar mönstret. 100 % = storleken mönsterfilen exporterades i (96 px per tum).',
    engInsetLabel: 'Kantmarginal',
    engInsetTitle:
      'Håller detta avstånd (mm) mellan gravyren och skärlinjen så att kanten inte bränns två gånger. 0 = gravera ända ut till kanten.',
    engInvertLabel: 'Invertera',
    engInvertTitle:
      'Som standard graveras mönstrets ovanligaste ton (oftast linjerna). Kryssa i för att gravera den andra tonen.',
    engRendering: 'Renderar gravyr… {0} / {1}',
    'e.ERR_PATTERN_LOAD': 'Kunde inte läsa mönsterbilden.',
    'e.ERR_BINARY_DXF': 'Binär DXF stöds inte – spara som ASCII-DXF.',
    'e.ERR_STL_PARSE': 'Kunde inte tolka STL-filen.',
  },
};
let lang = 'en';
try {
  const l = localStorage.getItem('nest_lang');
  if (l === 'sv' || l === 'en') lang = l;
} catch (e) {}
const t = (k, ...a) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\d+)\}/g, (_, i) => a[i]);
const msgOf = (err) => ('e.' + err.message in I18N.en ? t('e.' + err.message) : err.message);
