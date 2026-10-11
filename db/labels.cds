using pg from './schema';

// Alan etiketleri. Metinler _i18n/i18n.properties dosyasındadır;
// Fiori elements ekranları başlıkları buradan otomatik alır.

annotate pg.Campaigns with @title: '{i18n>Campaign}' {
    title        @title: '{i18n>Title}';
    summary      @title: '{i18n>Summary}';
    description  @title: '{i18n>Description}'  @UI.MultiLineText;
    coverImage   @title: '{i18n>CoverImage}';
    goalAmount   @title: '{i18n>GoalAmount}'   @Measures.ISOCurrency: 'TRY';
    raisedAmount @title: '{i18n>RaisedAmount}' @Measures.ISOCurrency: 'TRY';
    startDate    @title: '{i18n>StartDate}';
    endDate      @title: '{i18n>EndDate}';
    status       @title: '{i18n>Status}';
}

annotate pg.Donations with @title: '{i18n>Donation}' {
    referenceCode @title: '{i18n>ReferenceCode}';
    campaign      @title: '{i18n>Campaign}';
    donorName     @title: '{i18n>DonorName}';
    donorEmail    @title: '{i18n>Email}';
    amount        @title: '{i18n>Amount}' @Measures.ISOCurrency: currency;
    currency      @title: '{i18n>Currency}';
    method        @title: '{i18n>Method}';
    status        @title: '{i18n>Status}';
    isAnonymous   @title: '{i18n>IsAnonymous}';
    message       @title: '{i18n>Message}' @UI.MultiLineText;
    statusNote    @title: '{i18n>StatusNote}';
    createdAt     @title: '{i18n>CreatedAt}';
}

annotate pg.VolunteerAreas with @title: '{i18n>VolunteerArea}';

annotate pg.VolunteerApplications with @title: '{i18n>VolunteerApplication}' {
    firstName    @title: '{i18n>FirstName}';
    lastName     @title: '{i18n>LastName}';
    email        @title: '{i18n>Email}';
    phone        @title: '{i18n>Phone}';
    area         @title: '{i18n>VolunteerArea}';
    availability @title: '{i18n>Availability}';
    motivation   @title: '{i18n>Motivation}' @UI.MultiLineText;
    consentGiven @title: '{i18n>ConsentGiven}';
    status       @title: '{i18n>Status}';
    adminNote    @title: '{i18n>AdminNote}';
    createdAt    @title: '{i18n>AppliedAt}';
}

annotate pg.Announcements with @title: '{i18n>Announcement}' {
    title       @title: '{i18n>Title}';
    body        @title: '{i18n>Body}' @UI.MultiLineText;
    type        @title: '{i18n>Type}';
    publishDate @title: '{i18n>PublishDate}';
    expiryDate  @title: '{i18n>ExpiryDate}';
    isActive    @title: '{i18n>IsActive}';
}

annotate pg.Faqs with @title: '{i18n>Faq}' {
    category  @title: '{i18n>Category}';
    question  @title: '{i18n>Question}';
    answer    @title: '{i18n>Answer}' @UI.MultiLineText;
    sortOrder @title: '{i18n>SortOrder}';
}

annotate pg.SiteStats with @title: '{i18n>SiteStat}' {
    code      @title: '{i18n>Code}';
    label     @title: '{i18n>Label}';
    value     @title: '{i18n>Value}';
    icon      @title: '{i18n>Icon}';
    sortOrder @title: '{i18n>SortOrder}';
}

annotate pg.ContactMessages with @title: '{i18n>ContactMessage}' {
    name         @title: '{i18n>FullName}';
    email        @title: '{i18n>Email}';
    subject      @title: '{i18n>Subject}';
    message      @title: '{i18n>Message}' @UI.MultiLineText;
    consentGiven @title: '{i18n>ConsentGiven}';
    status       @title: '{i18n>Status}';
    adminNote    @title: '{i18n>AdminNote}';
    createdAt    @title: '{i18n>ReceivedAt}';
}

annotate pg.Animals with @title: '{i18n>Animal}' {
    name        @title: '{i18n>AnimalName}';
    species     @title: '{i18n>Species}';
    breed       @title: '{i18n>Breed}';
    ageMonths   @title: '{i18n>AgeMonths}';
    sex         @title: '{i18n>Sex}';
    size        @title: '{i18n>Size}';
    neutered    @title: '{i18n>Neutered}';
    vaccinated  @title: '{i18n>Vaccinated}';
    traits      @title: '{i18n>Traits}';
    healthNotes @title: '{i18n>HealthNotes}' @UI.MultiLineText;
    story       @title: '{i18n>Story}'       @UI.MultiLineText;
    coverImage  @title: '{i18n>CoverImage}';
    arrivalDate @title: '{i18n>ArrivalDate}';
    status      @title: '{i18n>Status}';
}

annotate pg.AnimalPhotos with @title: '{i18n>Photo}' {
    url       @title: '{i18n>PhotoUrl}';
    caption   @title: '{i18n>Caption}';
    sortOrder @title: '{i18n>SortOrder}';
}

annotate pg.AdoptionApplications with @title: '{i18n>AdoptionApplication}' {
    animal          @title: '{i18n>Animal}';
    firstName       @title: '{i18n>FirstName}';
    lastName        @title: '{i18n>LastName}';
    email           @title: '{i18n>Email}';
    phone           @title: '{i18n>Phone}';
    city            @title: '{i18n>City}';
    housingType     @title: '{i18n>HousingType}';
    hasGarden       @title: '{i18n>HasGarden}';
    otherPets       @title: '{i18n>OtherPets}';
    experience      @title: '{i18n>Experience}' @UI.MultiLineText;
    householdAgrees @title: '{i18n>HouseholdAgrees}';
    consentGiven    @title: '{i18n>ConsentGiven}';
    status          @title: '{i18n>Status}';
    adminNote       @title: '{i18n>AdminNote}';
    createdAt       @title: '{i18n>AppliedAt}';
}

annotate pg.Events with @title: '{i18n>Event}' {
    title           @title: '{i18n>Title}';
    summary         @title: '{i18n>Summary}';
    description     @title: '{i18n>Description}' @UI.MultiLineText;
    category        @title: '{i18n>EventCategory}';
    startDateTime   @title: '{i18n>StartDateTime}';
    endDateTime     @title: '{i18n>EndDateTime}';
    location        @title: '{i18n>Location}';
    capacity        @title: '{i18n>Capacity}';
    registeredCount @title: '{i18n>RegisteredCount}';
    coverImage      @title: '{i18n>CoverImage}';
    status          @title: '{i18n>Status}';
}

annotate pg.EventRegistrations with @title: '{i18n>EventRegistration}' {
    event        @title: '{i18n>Event}';
    name         @title: '{i18n>FullName}';
    email        @title: '{i18n>Email}';
    phone        @title: '{i18n>Phone}';
    consentGiven @title: '{i18n>ConsentGiven}';
    attendance   @title: '{i18n>Attendance}';
    createdAt    @title: '{i18n>RegisteredAt}';
}

annotate pg.Albums with @title: '{i18n>Album}' {
    title       @title: '{i18n>Title}';
    description @title: '{i18n>Description}' @UI.MultiLineText;
    albumDate   @title: '{i18n>AlbumDate}';
    coverImage  @title: '{i18n>CoverImage}';
    event       @title: '{i18n>Event}';
    isPublished @title: '{i18n>IsPublished}';
}

annotate pg.MediaItems with @title: '{i18n>MediaItem}' {
    url       @title: '{i18n>PhotoUrl}';
    caption   @title: '{i18n>Caption}';
    layout    @title: '{i18n>MediaLayout}';
    featured  @title: '{i18n>Featured}';
    sortOrder @title: '{i18n>SortOrder}';
}
