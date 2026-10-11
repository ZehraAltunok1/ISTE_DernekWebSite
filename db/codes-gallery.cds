namespace pg;

using {
    pg.MediaLayout,
    pg.MediaItems
} from './schema';

// Galeri kod tablosu — yönetim panelindeki açılır listede Türkçe metin

@cds.autoexpose @readonly
entity MediaLayoutTexts {
    key code : MediaLayout;
        text : String(40);
}

extend MediaItems with {
    _layout : Association to one MediaLayoutTexts on _layout.code = layout;
}
