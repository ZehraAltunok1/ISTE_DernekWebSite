using AdminService as service from '../../srv/admin-service';

/*
 * Yönetim paneli — sahiplendirme ekranları (hayvanlar ve başvurular).
 * Genel ekranlar annotations.cds dosyasındadır.
 */

// ═════════════════════════════════════════════════════════════
// Kod tabloları: açılır listelerde Türkçe metin görünsün
// ═════════════════════════════════════════════════════════════

annotate service.SpeciesTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.AnimalSexTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.AnimalSizeTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.AnimalStatusTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

// ═════════════════════════════════════════════════════════════
// Hayvanlar
// ═════════════════════════════════════════════════════════════

annotate service.Animals with {
    species @Common: {
        Text                    : _species.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'SpeciesTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: species,
                ValueListProperty: 'code'
            }]
        }
    };
    sex     @Common: {
        Text                    : _sex.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'AnimalSexTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: sex,
                ValueListProperty: 'code'
            }]
        }
    };
    size    @Common: {
        Text                    : _size.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'AnimalSizeTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: size,
                ValueListProperty: 'code'
            }]
        }
    };
    status  @Common: {
        Text                    : _status.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'AnimalStatusTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: status,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.Animals with @(
    UI.HeaderInfo          : {
        TypeName      : '{i18n>Animal}',
        TypeNamePlural: '{i18n>Animals}',
        Title         : {Value: name},
        Description   : {Value: breed},
        ImageUrl      : coverImage
    },
    UI.SelectionFields     : [
        species,
        status,
        size,
        neutered
    ],
    UI.LineItem            : [
        {Value: name},
        {Value: species},
        {Value: breed},
        {Value: ageMonths},
        {Value: sex},
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithIcon
        },
        {Value: arrivalDate}
    ],
    UI.PresentationVariant : {
        SortOrder     : [{
            Property  : arrivalDate,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #status   : {
        Value      : status,
        Title      : '{i18n>Status}',
        Criticality: _status.criticality
    },
    UI.HeaderFacets        : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#status'
    }],
    UI.FieldGroup #Identity: {Data: [
        {Value: name},
        {Value: species},
        {Value: breed},
        {Value: ageMonths},
        {Value: sex},
        {Value: size},
        {Value: arrivalDate},
        {Value: status}
    ]},
    UI.FieldGroup #Health  : {Data: [
        {Value: neutered},
        {Value: vaccinated},
        {Value: healthNotes}
    ]},
    UI.FieldGroup #Profile : {Data: [
        {Value: traits},
        {Value: coverImage},
        {Value: story}
    ]},
    UI.Facets              : [
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'GeneralFacet',
            Label : '{i18n>General}',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Target: '@UI.FieldGroup#Identity'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : '{i18n>HealthNotes}',
                    Target: '@UI.FieldGroup#Health'
                }
            ]
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Profile}',
            Target: '@UI.FieldGroup#Profile'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Photos}',
            Target: 'photos/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>AdoptionApplications}',
            Target: 'applications/@UI.LineItem#OfAnimal'
        }
    ]
);

// Fotoğraf alt tablosu (composition) — taslak modunda satır eklenip silinebilir
annotate service.AnimalPhotos with @(
    UI.HeaderInfo: {
        TypeName      : '{i18n>Photo}',
        TypeNamePlural: '{i18n>Photos}',
        Title         : {Value: caption}
    },
    UI.LineItem  : [
        {Value: url},
        {Value: caption},
        {Value: sortOrder}
    ]
);

// ═════════════════════════════════════════════════════════════
// Sahiplenme başvuruları
// ═════════════════════════════════════════════════════════════

annotate service.AdoptionApplications with {
    status      @Common.Text: _status.text   @Common.TextArrangement: #TextOnly;
    housingType @Common.Text: _housing.text  @Common.TextArrangement: #TextOnly;
    animal      @Common: {
        Text           : animal.name,
        TextArrangement: #TextOnly,
        ValueList      : {
            CollectionPath: 'Animals',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: animal_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name'
                }
            ]
        }
    };
};

annotate service.AdoptionApplications with actions {
    approve @Core.OperationAvailable: {$edmJson: {$Eq: [
        {$Path: 'in/status'},
        'Pending'
    ]}}
            (note @title: '{i18n>Note}'  @UI.MultiLineText);
    decline @Core.OperationAvailable: {$edmJson: {$Eq: [
        {$Path: 'in/status'},
        'Pending'
    ]}}
            (note @title: '{i18n>Note}'  @UI.MultiLineText);
};

annotate service.AdoptionApplications with @(
    UI.HeaderInfo            : {
        TypeName      : '{i18n>AdoptionApplication}',
        TypeNamePlural: '{i18n>AdoptionApplications}',
        Title         : {Value: animal_ID},
        Description   : {Value: email},
        TypeImageUrl  : 'sap-icon://family-care'
    },
    UI.SelectionFields       : [
        status,
        animal_ID,
        housingType,
        createdAt
    ],
    UI.LineItem              : [
        {Value: createdAt},
        {Value: animal_ID},
        {Value: firstName},
        {Value: lastName},
        {Value: city},
        {Value: housingType},
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithIcon
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.approve',
            Label : '{i18n>Approve}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.decline',
            Label : '{i18n>Reject}'
        }
    ],
    // Hayvan detayındaki "Başvurular" tablosu için daha kısa sütun listesi
    UI.LineItem #OfAnimal    : [
        {Value: createdAt},
        {Value: firstName},
        {Value: lastName},
        {Value: city},
        {
            Value      : status,
            Criticality: _status.criticality
        }
    ],
    UI.PresentationVariant   : {
        SortOrder     : [{
            Property  : createdAt,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #status     : {
        Value      : status,
        Title      : '{i18n>Status}',
        Criticality: _status.criticality
    },
    UI.HeaderFacets          : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#status'
    }],
    UI.Identification        : [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.approve',
            Label : '{i18n>Approve}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.decline',
            Label : '{i18n>Reject}'
        }
    ],
    UI.FieldGroup #Applicant : {Data: [
        {Value: firstName},
        {Value: lastName},
        {Value: email},
        {Value: phone},
        {Value: city}
    ]},
    UI.FieldGroup #Home      : {Data: [
        {Value: housingType},
        {Value: hasGarden},
        {Value: otherPets},
        {Value: householdAgrees},
        {Value: consentGiven}
    ]},
    UI.FieldGroup #Motivation: {Data: [{Value: experience}]},
    UI.FieldGroup #Evaluation: {Data: [
        {Value: status},
        {Value: adminNote},
        {Value: modifiedBy},
        {Value: modifiedAt}
    ]},
    UI.Facets                : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Applicant}',
            Target: '@UI.FieldGroup#Applicant'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Home}',
            Target: '@UI.FieldGroup#Home'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Experience}',
            Target: '@UI.FieldGroup#Motivation'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Evaluation}',
            Target: '@UI.FieldGroup#Evaluation'
        }
    ]
);
