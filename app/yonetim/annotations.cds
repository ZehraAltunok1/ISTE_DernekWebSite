using AdminService as service from '../../srv/admin-service';

/*
 * Yönetim paneli ekran tanımları (Fiori elements).
 * Ekranlar kodla değil, bu annotation'larla "tarif edilir":
 *   UI.SelectionFields → filtre çubuğu     UI.LineItem   → liste sütunları
 *   UI.HeaderInfo      → sayfa başlığı      UI.Facets     → nesne sayfası bölümleri
 *   UI.FieldGroup      → form alan grupları UI.DataPoint  → başlıktaki göstergeler
 */

// ═════════════════════════════════════════════════════════════
// Ortak: durum metinleri ve açılır listeler
// ═════════════════════════════════════════════════════════════

annotate service.CampaignStatusTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.AnnouncementTypeTexts with {
    code @Common.Text: text  @Common.TextArrangement: #TextOnly;
}

annotate service.VolunteerAreas with {
    code @Common.Text: name  @Common.TextArrangement: #TextOnly;
}

// ═════════════════════════════════════════════════════════════
// Kampanyalar
// ═════════════════════════════════════════════════════════════

annotate service.Campaigns with {
    status @Common: {
        Text                    : _status.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'CampaignStatusTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: status,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.Campaigns with @(
    UI.HeaderInfo         : {
        TypeName      : '{i18n>Campaign}',
        TypeNamePlural: '{i18n>Campaigns}',
        Title         : {Value: title},
        Description   : {Value: summary},
        TypeImageUrl  : 'sap-icon://heart'
    },
    UI.SelectionFields    : [
        status,
        startDate,
        endDate
    ],
    UI.LineItem           : [
        {Value: title},
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithoutIcon
        },
        {
            $Type : 'UI.DataFieldForAnnotation',
            Target: '@UI.DataPoint#progress',
            Label : '{i18n>Progress}'
        },
        {Value: raisedAmount},
        {Value: goalAmount},
        {Value: endDate}
    ],
    UI.PresentationVariant: {
        SortOrder     : [{
            Property  : startDate,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #progress: {
        Value        : raisedAmount,
        TargetValue  : goalAmount,
        Visualization: #Progress,
        Title        : '{i18n>Progress}'
    },
    UI.HeaderFacets       : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#progress'
    }],
    UI.FieldGroup #General: {Data: [
        {Value: title},
        {Value: summary},
        {Value: status},
        {Value: coverImage}
    ]},
    UI.FieldGroup #Finance: {Data: [
        {Value: goalAmount},
        {Value: raisedAmount},
        {Value: startDate},
        {Value: endDate}
    ]},
    UI.FieldGroup #Details: {Data: [{Value: description}]},
    UI.Facets             : [
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
                    Target: '@UI.FieldGroup#Finance'
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
            Label : '{i18n>Donations}',
            Target: 'donations/@UI.LineItem'
        }
    ]
);

// ═════════════════════════════════════════════════════════════
// Bağışlar
// ═════════════════════════════════════════════════════════════

annotate service.Donations with {
    status   @Common.Text: _status.text  @Common.TextArrangement: #TextOnly;
    method   @Common.Text: _method.text  @Common.TextArrangement: #TextOnly;
    campaign @Common: {
        Text           : campaign.title,
        TextArrangement: #TextOnly,
        ValueList      : {
            CollectionPath: 'Campaigns',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: campaign_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'title'
                }
            ]
        }
    };
};

// Onay/Red yalnızca "Bekliyor" durumundaki bağışlarda etkin (sunucu da ayrıca kontrol eder)
annotate service.Donations with actions {
    confirm @Core.OperationAvailable: {$edmJson: {$Eq: [
        {$Path: 'in/status'},
        'Pending'
    ]}};
    decline @Core.OperationAvailable: {$edmJson: {$Eq: [
        {$Path: 'in/status'},
        'Pending'
    ]}}
            (reason @title: '{i18n>Reason}'  @UI.MultiLineText);
};

annotate service.Donations with @(
    UI.HeaderInfo          : {
        TypeName      : '{i18n>Donation}',
        TypeNamePlural: '{i18n>Donations}',
        Title         : {Value: referenceCode},
        Description   : {Value: donorName},
        TypeImageUrl  : 'sap-icon://lead'
    },
    UI.SelectionFields     : [
        status,
        method,
        campaign_ID,
        createdAt
    ],
    UI.LineItem            : [
        {Value: referenceCode},
        {Value: createdAt},
        {Value: donorName},
        {Value: campaign_ID},
        {Value: amount},
        {Value: method},
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithIcon
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.confirm',
            Label : '{i18n>Confirm}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.decline',
            Label : '{i18n>Reject}'
        }
    ],
    UI.PresentationVariant : {
        SortOrder     : [{
            Property  : createdAt,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #amount   : {
        Value: amount,
        Title: '{i18n>Amount}'
    },
    UI.DataPoint #status   : {
        Value      : status,
        Title      : '{i18n>Status}',
        Criticality: _status.criticality
    },
    UI.HeaderFacets        : [
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#amount'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#status'
        }
    ],
    UI.Identification      : [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.confirm',
            Label : '{i18n>Confirm}'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.decline',
            Label : '{i18n>Reject}'
        }
    ],
    UI.FieldGroup #Donor   : {Data: [
        {Value: donorName},
        {Value: donorEmail},
        {Value: isAnonymous},
        {Value: message}
    ]},
    UI.FieldGroup #Payment : {Data: [
        {Value: campaign_ID},
        {Value: amount},
        {Value: method},
        {Value: status},
        {Value: statusNote},
        {Value: createdAt}
    ]},
    UI.Facets              : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>DonorName}',
            Target: '@UI.FieldGroup#Donor'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Details}',
            Target: '@UI.FieldGroup#Payment'
        }
    ]
);

// ═════════════════════════════════════════════════════════════
// Gönüllü başvuruları
// ═════════════════════════════════════════════════════════════

annotate service.VolunteerApplications with {
    status @Common.Text: _status.text  @Common.TextArrangement: #TextOnly;
    area   @Common: {
        Text                    : area.name,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'VolunteerAreas',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: area_code,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.VolunteerApplications with actions {
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

annotate service.VolunteerApplications with @(
    UI.HeaderInfo            : {
        TypeName      : '{i18n>VolunteerApplication}',
        TypeNamePlural: '{i18n>VolunteerApplications}',
        Title         : {Value: firstName},
        Description   : {Value: lastName},
        TypeImageUrl  : 'sap-icon://group'
    },
    UI.SelectionFields       : [
        status,
        area_code,
        createdAt
    ],
    UI.LineItem              : [
        {Value: firstName},
        {Value: lastName},
        {Value: email},
        {Value: area_code},
        {Value: createdAt},
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
        {Value: area_code},
        {Value: availability},
        {Value: consentGiven}
    ]},
    UI.FieldGroup #Motivation: {Data: [{Value: motivation}]},
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
            Label : '{i18n>Motivation}',
            Target: '@UI.FieldGroup#Motivation'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Evaluation}',
            Target: '@UI.FieldGroup#Evaluation'
        }
    ]
);

// ═════════════════════════════════════════════════════════════
// Duyurular
// ═════════════════════════════════════════════════════════════

annotate service.Announcements with {
    type @Common: {
        Text                    : _type.text,
        TextArrangement         : #TextOnly,
        ValueListWithFixedValues: true,
        ValueList               : {
            CollectionPath: 'AnnouncementTypeTexts',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: type,
                ValueListProperty: 'code'
            }]
        }
    };
};

annotate service.Announcements with @(
    UI.HeaderInfo          : {
        TypeName      : '{i18n>Announcement}',
        TypeNamePlural: '{i18n>Announcements}',
        Title         : {Value: title},
        TypeImageUrl  : 'sap-icon://megamenu'
    },
    UI.SelectionFields     : [
        type,
        isActive,
        publishDate
    ],
    UI.LineItem            : [
        {Value: title},
        {
            Value      : type,
            Criticality: _type.criticality
        },
        {Value: publishDate},
        {Value: expiryDate},
        {Value: isActive}
    ],
    UI.PresentationVariant : {
        SortOrder     : [{
            Property  : publishDate,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.FieldGroup #Content : {Data: [
        {Value: title},
        {Value: type},
        {Value: body}
    ]},
    UI.FieldGroup #Publish : {Data: [
        {Value: publishDate},
        {Value: expiryDate},
        {Value: isActive}
    ]},
    UI.Facets              : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>General}',
            Target: '@UI.FieldGroup#Content'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Publishing}',
            Target: '@UI.FieldGroup#Publish'
        }
    ]
);

// ═════════════════════════════════════════════════════════════
// SSS ve site istatistikleri
// ═════════════════════════════════════════════════════════════

annotate service.Faqs with @(
    UI.HeaderInfo         : {
        TypeName      : '{i18n>Faq}',
        TypeNamePlural: 'SSS',
        Title         : {Value: question},
        Description   : {Value: category}
    },
    UI.SelectionFields    : [category],
    UI.LineItem           : [
        {Value: category},
        {Value: question},
        {Value: sortOrder}
    ],
    UI.PresentationVariant: {
        SortOrder     : [
            {Property: category},
            {Property: sortOrder}
        ],
        Visualizations: ['@UI.LineItem']
    },
    UI.FieldGroup #Main   : {Data: [
        {Value: category},
        {Value: question},
        {Value: answer},
        {Value: sortOrder}
    ]},
    UI.Facets             : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>General}',
        Target: '@UI.FieldGroup#Main'
    }]
);

annotate service.SiteStats with @(
    UI.HeaderInfo         : {
        TypeName      : '{i18n>SiteStat}',
        TypeNamePlural: '{i18n>SiteStat}',
        Title         : {Value: label}
    },
    UI.LineItem           : [
        {Value: label},
        {Value: value},
        {Value: icon},
        {Value: sortOrder}
    ],
    UI.PresentationVariant: {
        SortOrder     : [{Property: sortOrder}],
        Visualizations: ['@UI.LineItem']
    },
    UI.FieldGroup #Main   : {Data: [
        {Value: code},
        {Value: label},
        {Value: value},
        {Value: icon},
        {Value: sortOrder}
    ]},
    UI.Facets             : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>General}',
        Target: '@UI.FieldGroup#Main'
    }]
);

// ═════════════════════════════════════════════════════════════
// İletişim mesajları
// ═════════════════════════════════════════════════════════════

annotate service.ContactMessages with {
    status @Common.Text: _status.text  @Common.TextArrangement: #TextOnly;
};

annotate service.ContactMessages with actions {
    markAnswered @Core.OperationAvailable: {$edmJson: {$Ne: [
        {$Path: 'in/status'},
        'Answered'
    ]}}
                 (note @title: '{i18n>Note}'  @UI.MultiLineText);
};

annotate service.ContactMessages with @(
    UI.HeaderInfo         : {
        TypeName      : '{i18n>ContactMessage}',
        TypeNamePlural: '{i18n>ContactMessages}',
        Title         : {Value: subject},
        Description   : {Value: name},
        TypeImageUrl  : 'sap-icon://email'
    },
    UI.SelectionFields    : [
        status,
        createdAt
    ],
    UI.LineItem           : [
        {Value: createdAt},
        {Value: name},
        {Value: email},
        {Value: subject},
        {
            Value                    : status,
            Criticality              : _status.criticality,
            CriticalityRepresentation: #WithIcon
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'AdminService.markAnswered',
            Label : '{i18n>MarkAnswered}'
        }
    ],
    UI.PresentationVariant: {
        SortOrder     : [{
            Property  : createdAt,
            Descending: true
        }],
        Visualizations: ['@UI.LineItem']
    },
    UI.DataPoint #status  : {
        Value      : status,
        Title      : '{i18n>Status}',
        Criticality: _status.criticality
    },
    UI.HeaderFacets       : [{
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#status'
    }],
    UI.Identification     : [{
        $Type : 'UI.DataFieldForAction',
        Action: 'AdminService.markAnswered',
        Label : '{i18n>MarkAnswered}'
    }],
    UI.FieldGroup #Sender : {Data: [
        {Value: name},
        {Value: email},
        {Value: createdAt},
        {Value: consentGiven}
    ]},
    UI.FieldGroup #Content: {Data: [
        {Value: subject},
        {Value: message}
    ]},
    UI.FieldGroup #Answer : {Data: [
        {Value: status},
        {Value: adminNote},
        {Value: modifiedBy},
        {Value: modifiedAt}
    ]},
    UI.Facets             : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Message}',
            Target: '@UI.FieldGroup#Content'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>FullName}',
            Target: '@UI.FieldGroup#Sender'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : '{i18n>Evaluation}',
            Target: '@UI.FieldGroup#Answer'
        }
    ]
);
