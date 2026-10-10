namespace pg;

using {
    pg.CampaignStatus,
    pg.DonationStatus,
    pg.DonationMethod,
    pg.ApplicationStatus,
    pg.AnnouncementType,
    pg.MessageStatus,
    pg.ContactMessages,
    pg.Campaigns,
    pg.Donations,
    pg.VolunteerApplications,
    pg.Announcements
} from './schema';

/*
 * Durum (enum) alanları için Türkçe metin ve renk (criticality) tabloları.
 * Veritabanındaki değer İngilizce kod olarak kalır (ör. "Pending");
 * Fiori elements ekranda bu tablolardaki Türkçe metni ve rengi gösterir.
 *
 * Criticality: 0 = nötr, 1 = kırmızı, 2 = turuncu, 3 = yeşil
 */

@cds.autoexpose @readonly
entity CampaignStatusTexts {
    key code        : CampaignStatus;
        text        : String(40);
        criticality : Integer;
}

@cds.autoexpose @readonly
entity DonationStatusTexts {
    key code        : DonationStatus;
        text        : String(40);
        criticality : Integer;
}

@cds.autoexpose @readonly
entity DonationMethodTexts {
    key code : DonationMethod;
        text : String(40);
}

@cds.autoexpose @readonly
entity ApplicationStatusTexts {
    key code        : ApplicationStatus;
        text        : String(40);
        criticality : Integer;
}

@cds.autoexpose @readonly
entity AnnouncementTypeTexts {
    key code        : AnnouncementType;
        text        : String(40);
        criticality : Integer;
}

@cds.autoexpose @readonly
entity MessageStatusTexts {
    key code        : MessageStatus;
        text        : String(40);
        criticality : Integer;
}

// Durum alanlarından metin tablolarına (yönetilmeyen) ilişkiler
extend ContactMessages with {
    _status : Association to one MessageStatusTexts on _status.code = status;
}

extend Campaigns with {
    _status : Association to one CampaignStatusTexts on _status.code = status;
}

extend Donations with {
    _status : Association to one DonationStatusTexts on _status.code = status;
    _method : Association to one DonationMethodTexts on _method.code = method;
}

extend VolunteerApplications with {
    _status : Association to one ApplicationStatusTexts on _status.code = status;
}

extend Announcements with {
    _type : Association to one AnnouncementTypeTexts on _type.code = type;
}
