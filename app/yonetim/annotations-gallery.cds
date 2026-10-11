using AdminService as service from '../../srv/admin-service';

/*
 * Yönetim paneli — galeri ekranları (albümler ve fotoğrafları).
 * Genel ekranlar annotations.cds dosyasındadır.
 */

annotate service.MediaLayoutTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

// ═════════════════════════════════════════════════════════════
// Albümler
// ═════════════════════════════════════════════════════════════

annotate service.Albums with {
    event @Common: {
        Text           : event.title,
        TextArrangement: #TextOnly,
        ValueList      : {
            CollectionPath: 'Events',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: event_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'title'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'startDateTime'
                }
            ]
        }
    };
};

annotate service.Albums with @(
    UI.HeaderInfo         : {
        TypeName      : '{i18n>Album}',
        TypeNamePlural: '{i18n>Albums}',
        Title         : {Value: title},
        Description   : {Value: albumDate},
        ImageUrl      : coverImage
    },
    UI.SelectionFields    : [
        isPublished,
        event_ID,
        albumDate
    ],
    UI.LineItem           : [
        {Value: title},
        {Value: albumDate},
        {Value: event_ID},
        {Value: isPublished}
    ],
    UI.PresentationVariant: {
        SortOrder     : [{
            Property  : albumDate,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.FieldGroup #General: {Data: [
        {Value: title},
        {Value: albumDate},
        {Value: event_ID},
        {Value: isPublished},
        {Value: coverImage},
        {Value: description}
    ]},
    UI.Facets             : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'GeneralFacet',
            Label : '{i18n>General}',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>MediaItems}',
            Target: 'media/@UI.LineItem'
        }
    ]
);

// Fotoğraf alt tablosu (composition) — taslak modunda satır eklenip silinebilir
annotate service.MediaItems with {
    layout @Common: {
        Text                    : _layout.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'MediaLayoutTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: layout,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.MediaItems with @(
    UI.HeaderInfo: {
        TypeName      : '{i18n>MediaItem}',
        TypeNamePlural: '{i18n>MediaItems}',
        Title         : {Value: caption}
    },
    UI.LineItem  : [
        {Value: url},
        {Value: caption},
        {Value: layout},
        {Value: featured},
        {Value: sortOrder}
    ]
);
