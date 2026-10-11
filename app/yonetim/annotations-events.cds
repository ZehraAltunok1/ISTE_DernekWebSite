using AdminService as service from '../../srv/admin-service';

/*
 * Yönetim paneli — etkinlik ekranları (etkinlikler ve kayıtlar).
 * Genel ekranlar annotations.cds dosyasındadır.
 */

// ═════════════════════════════════════════════════════════════
// Kod tabloları: açılır listelerde Türkçe metin görünsün
// ═════════════════════════════════════════════════════════════

annotate service.EventCategoryTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.EventStatusTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.AttendanceTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

// ═════════════════════════════════════════════════════════════
// Etkinlikler
// ═════════════════════════════════════════════════════════════

annotate service.Events with {
    category @Common: {
        Text                    : _category.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'EventCategoryTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: category,
                ValueListProperty: 'code'
            }]
        }
    };
    status   @Common: {
        Text                    : _status.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'EventStatusTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: status,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.Events with @(
    UI.HeaderInfo            : {
        TypeName      : '{i18n>Event}',
        TypeNamePlural: '{i18n>Events}',
        Title         : {Value: title},
        Description   : {Value: location},
        ImageUrl      : coverImage
    },
    UI.SelectionFields       : [
        status,
        category,
        startDateTime
    ],
    UI.LineItem              : [
        {Value: title},
        {Value: category},
        {Value: startDateTime},
        {Value: location},
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : '{i18n>RegisteredCount}',
            Target: '@UI.DataPoint#seats'
        },
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithIcon
        }
    ],
    UI.PresentationVariant   : {
        SortOrder     : [{
            Property  : startDateTime,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    // Doluluk: kayıtlı kişi / kontenjan (liste ve başlıkta çubuk olarak)
    UI.DataPoint #seats      : {
        Value        : registeredCount,
        TargetValue  : capacity,
        Title        : '{i18n>RegisteredCount}',
        Visualization: #Progress
    },
    UI.DataPoint #status     : {
        Value      : status,
        Title      : '{i18n>Status}',
        Criticality: _status.criticality
    },
    UI.HeaderFacets          : [
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#status'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#seats'
        }
    ],
    UI.FieldGroup #General   : {Data: [
        {Value: title},
        {Value: category},
        {Value: summary},
        {Value: status},
        {Value: coverImage}
    ]},
    UI.FieldGroup #Schedule  : {Data: [
        {Value: startDateTime},
        {Value: endDateTime},
        {Value: location},
        {Value: capacity},
        {Value: registeredCount}
    ]},
    UI.FieldGroup #Details   : {Data: [{Value: description}]},
    UI.Facets                : [
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'GeneralFacet',
            Label : '{i18n>General}',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Target: '@UI.FieldGroup#General'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : '{i18n>Schedule}',
                    Target: '@UI.FieldGroup#Schedule'
                }
            ]
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Description}',
            Target: '@UI.FieldGroup#Details'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>EventRegistrations}',
            Target: 'registrations/@UI.LineItem#OfEvent'
        }
    ]
);

// ═════════════════════════════════════════════════════════════
// Etkinlik kayıtları
// ═════════════════════════════════════════════════════════════

annotate service.EventRegistrations with {
    attendance @Common: {
        Text                    : _attendance.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'AttendanceTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: attendance,
                ValueListProperty: 'code'
            }]
        }
    };
    event      @Common: {
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

// Aynı durumu tekrar işaretlemek anlamsız: buton yalnızca farklı durumdayken aktif
annotate service.EventRegistrations with actions {
    markAttended @Core.OperationAvailable: {$edmJson: {$Ne: [
        {$Path: 'in/attendance'},
        'Attended'
    ]}};
    markAbsent   @Core.OperationAvailable: {$edmJson: {$Ne: [
        {$Path: 'in/attendance'},
        'Absent'
    ]}};
};

annotate service.EventRegistrations with @(
    UI.HeaderInfo            : {
        TypeName      : '{i18n>EventRegistration}',
        TypeNamePlural: '{i18n>EventRegistrations}',
        Title         : {Value: name},
        Description   : {Value: event_ID},
        TypeImageUrl  : 'sap-icon://appointment-2'
    },
    UI.SelectionFields       : [
        event_ID,
        attendance,
        createdAt
    ],
    UI.LineItem              : [
        {Value: createdAt},
        {Value: event_ID},
        {Value: name},
        {Value: email},
        {Value: phone},
        {
            Value                    : attendance,
            Criticality              : _attendance.criticality,
            CriticalityRepresentation: #WithIcon
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.markAttended',
            Label : '{i18n>MarkAttended}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.markAbsent',
            Label : '{i18n>MarkAbsent}'
        }
    ],
    // Etkinlik detayındaki "Kayıtlar" tablosu: etkinlik sütunu gereksiz
    UI.LineItem #OfEvent     : [
        {Value: name},
        {Value: email},
        {Value: phone},
        {Value: createdAt},
        {
            Value      : attendance,
            Criticality: _attendance.criticality
        }
    ],
    UI.PresentationVariant   : {
        SortOrder     : [{
            Property  : createdAt,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #attendance : {
        Value      : attendance,
        Title      : '{i18n>Attendance}',
        Criticality: _attendance.criticality
    },
    UI.HeaderFacets          : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#attendance'
    }],
    UI.Identification        : [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.markAttended',
            Label : '{i18n>MarkAttended}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.markAbsent',
            Label : '{i18n>MarkAbsent}'
        }
    ],
    UI.FieldGroup #Attendee  : {Data: [
        {Value: event_ID},
        {Value: name},
        {Value: email},
        {Value: phone},
        {Value: consentGiven},
        {Value: createdAt},
        {Value: attendance}
    ]},
    UI.Facets                : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>EventRegistration}',
        Target: '@UI.FieldGroup#Attendee'
    }]
);
