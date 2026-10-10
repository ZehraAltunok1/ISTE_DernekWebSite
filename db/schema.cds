namespace pg;

using {
    cuid,
    managed,
    sap.common.CodeList
} from '@sap/cds/common';

// ─────────────────────────────────────────────────────────────
// Ortak tipler
// ─────────────────────────────────────────────────────────────

type Amount : Decimal(12, 2);
type Email  : String(254) @assert.format: '^[^\s@]+@[^\s@]+\.[^\s@]+$';
type Phone  : String(20);

type CampaignStatus    : String(10) enum { Draft; Active; Completed };
type DonationMethod    : String(4)  enum { IBAN; Card };
type DonationStatus    : String(10) enum { Pending; Confirmed; Rejected; Failed };
type ApplicationStatus : String(10) enum { Pending; Approved; Rejected };
type AnnouncementType  : String(10) enum { Info; Success; Warning; Urgent };
type MessageStatus     : String(10) enum { New; Read; Answered };

type Species           : String(10) enum { Cat; Dog; Other };
type AnimalSex         : String(6)  enum { Female; Male };
type AnimalSize        : String(6)  enum { Small; Medium; Large };
type AnimalStatus      : String(12) enum { Available; Reserved; Adopted; InTreatment };
type HousingType       : String(10) enum { Apartment; House; Farm };

// ─────────────────────────────────────────────────────────────
// Sahiplendirme
// ─────────────────────────────────────────────────────────────

entity Animals : cuid, managed {
    name         : String(60)  @mandatory;
    species      : Species     @mandatory;
    breed        : String(80);
    ageMonths    : Integer     @assert.range: [ 0, 360 ];
    sex          : AnimalSex;
    size         : AnimalSize;
    neutered     : Boolean default false;
    vaccinated   : Boolean default false;
    traits       : String(200); // virgülle ayrılmış etiketler: "Uysal, Çocuklarla iyi"
    healthNotes  : String(500);
    story        : LargeString;
    coverImage   : String(255);
    arrivalDate  : Date;
    status       : AnimalStatus default 'Available';
    // Composition: fotoğraflar hayvanın parçasıdır — taslakla birlikte düzenlenir, hayvanla birlikte silinir
    photos       : Composition of many AnimalPhotos on photos.animal = $self;
    applications : Association to many AdoptionApplications on applications.animal = $self;
}

entity AnimalPhotos : cuid {
    animal    : Association to Animals;
    url       : String(255) @mandatory;
    caption   : String(120);
    sortOrder : Integer default 0;
}

entity AdoptionApplications : cuid, managed {
    animal          : Association to Animals @mandatory;
    firstName       : String(60)   @mandatory;
    lastName        : String(60)   @mandatory;
    email           : Email        @mandatory;
    phone           : Phone        @mandatory;
    city            : String(60)   @mandatory;
    housingType     : HousingType  @mandatory;
    hasGarden       : Boolean default false;
    otherPets       : String(200);
    experience      : String(1000) @mandatory;
    householdAgrees : Boolean default false;
    consentGiven    : Boolean default false;
    status          : ApplicationStatus default 'Pending';
    adminNote       : String(500);
}

// ─────────────────────────────────────────────────────────────
// Kampanyalar ve bağışlar
// ─────────────────────────────────────────────────────────────

entity Campaigns : cuid, managed {
    title        : String(120) @mandatory;
    summary      : String(300) @mandatory;
    description  : LargeString;
    coverImage   : String(255);
    goalAmount   : Amount      @mandatory  @assert.range: [ 1, 10000000 ];
    // Yalnızca onaylanan bağışlarla sunucuda güncellenir; elle düzenlenmez.
    raisedAmount : Amount default 0       @readonly;
    startDate    : Date;
    endDate      : Date;
    status       : CampaignStatus default 'Draft';
    donations    : Association to many Donations on donations.campaign = $self;
}

entity Donations : cuid, managed {
    referenceCode : String(20) @readonly;
    campaign      : Association to Campaigns; // boşsa genel bağış
    donorName     : String(100) @mandatory;
    donorEmail    : Email       @mandatory;
    amount        : Amount      @mandatory  @assert.range: [ 10, 100000 ];
    currency      : String(3) default 'TRY';
    method        : DonationMethod @mandatory;
    status        : DonationStatus default 'Pending';
    isAnonymous   : Boolean default false;
    message       : String(500);
    statusNote    : String(500);
}

// ─────────────────────────────────────────────────────────────
// Gönüllülük
// ─────────────────────────────────────────────────────────────

entity VolunteerAreas : CodeList {
    key code : String(20);
}

entity VolunteerApplications : cuid, managed {
    firstName    : String(60)  @mandatory;
    lastName     : String(60)  @mandatory;
    email        : Email       @mandatory;
    phone        : Phone       @mandatory;
    area         : Association to VolunteerAreas @mandatory;
    availability : String(200);
    motivation   : String(1000) @mandatory;
    consentGiven : Boolean default false;
    status       : ApplicationStatus default 'Pending';
    adminNote    : String(500);
}

// ─────────────────────────────────────────────────────────────
// İletişim
// ─────────────────────────────────────────────────────────────

entity ContactMessages : cuid, managed {
    name         : String(100)  @mandatory;
    email        : Email        @mandatory;
    subject      : String(150)  @mandatory;
    message      : String(2000) @mandatory;
    consentGiven : Boolean default false;
    status       : MessageStatus default 'New';
    adminNote    : String(500);
}

// ─────────────────────────────────────────────────────────────
// İçerik
// ─────────────────────────────────────────────────────────────

entity Announcements : cuid, managed {
    title       : String(150) @mandatory;
    body        : String(2000) @mandatory;
    type        : AnnouncementType default 'Info';
    publishDate : Date @mandatory;
    expiryDate  : Date;
    isActive    : Boolean default true;
}

entity Faqs : cuid {
    category  : String(30) @mandatory;
    question  : String(200) @mandatory;
    answer    : String(1000) @mandatory;
    sortOrder : Integer default 0;
}

/** Ana sayfadaki elle güncellenen sayaçlar (beslenen hayvan vb.) */
entity SiteStats {
    key code      : String(30);
        label     : String(60) @mandatory;
        value     : Integer default 0;
        icon      : String(60);
        sortOrder : Integer default 0;
}
