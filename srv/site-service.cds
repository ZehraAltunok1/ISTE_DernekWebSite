using pg from '../db/schema';
using from '../db/codes';
using from '../db/codes-events';

/**
 * Herkese açık servis — sitenin ziyaretçileri kullanır.
 *
 * Kurallar:
 *  - Bütün entity'ler salt okunur.
 *  - Ziyaretçi veri yazmak için yalnızca action'ları kullanabilir;
 *    böylece hangi alanların yazılabileceğini ve doğrulamayı sunucu belirler.
 *  - Kişisel veriler (e-posta, telefon) bu servisten asla dışarı verilmez.
 */
service SiteService {

    @readonly
    entity Campaigns       as
        projection on pg.Campaigns {
            ID,
            title,
            summary,
            description,
            coverImage,
            goalAmount,
            raisedAmount,
            startDate,
            endDate,
            status,
            donations : redirected to RecentDonations
        }
        where
            status in (
                'Active', 'Completed'
            );

    /** Onaylanmış bağışlar — anonim bağışçının adı gizlenir, e-posta hiç gösterilmez. */
    @readonly
    entity RecentDonations as
        projection on pg.Donations {
            ID,
            campaign,
            amount,
            currency,
            createdAt,
            case
                when isAnonymous = true
                     then 'Anonim Bağışçı'
                else donorName
            end as donorName : String(100)
        }
        where
            status = 'Confirmed';

    /** Yayın tarihi gelmiş ve süresi dolmamış duyurular (filtre: site-service.js) */
    @readonly
    entity Announcements   as
        projection on pg.Announcements {
            ID,
            title,
            body,
            type,
            publishDate,
            expiryDate
        }
        where
            isActive = true;

    @readonly
    entity Faqs            as projection on pg.Faqs;

    @readonly
    entity SiteStats       as projection on pg.SiteStats;

    @readonly
    entity VolunteerAreas  as projection on pg.VolunteerAreas;

    /** Sahiplendirme ilanları. Başvurular (kişisel veri) bu servisten verilmez. */
    @readonly
    entity Animals         as
        projection on pg.Animals {
            ID,
            name,
            species,
            breed,
            ageMonths,
            sex,
            size,
            neutered,
            vaccinated,
            traits,
            healthNotes,
            story,
            coverImage,
            arrivalDate,
            status,
            photos,
            _species,
            _sex,
            _size,
            _status
        };

    @readonly
    entity AnimalPhotos    as projection on pg.AnimalPhotos;

    /** Yayındaki ve iptal edilen etkinlikler (taslaklar gizli). Kayıt listesi (kişisel veri) verilmez. */
    @readonly
    entity Events          as
        projection on pg.Events {
            ID,
            title,
            summary,
            description,
            category,
            startDateTime,
            endDateTime,
            location,
            capacity,
            registeredCount,
            coverImage,
            status,
            _category,
            _status
        }
        where
            status in (
                'Published', 'Cancelled'
            );

    // ── Action'lar ──────────────────────────────────────────

    type DonationResult {
        referenceCode : String;
        status        : String;
        method        : String;
        amount        : Decimal(12, 2);
        bankName      : String;
        iban          : String;
        accountHolder : String;
    }

    /** Bağış oluşturur. Kart yöntemi simülasyondur; gerçek ödeme alınmaz. */
    action donate(campaignID : UUID,
                  donorName : String(100),
                  donorEmail : String(254),
                  amount : Decimal(12, 2),
                  method : String(4),
                  isAnonymous : Boolean,
                  message : String(500))       returns DonationResult;

    /** Gönüllü başvurusu oluşturur. */
    action applyVolunteer(firstName : String(60),
                          lastName : String(60),
                          email : String(254),
                          phone : String(20),
                          areaCode : String(20),
                          availability : String(200),
                          motivation : String(1000),
                          consentGiven : Boolean) returns String;

    /** Sahiplenme başvurusu oluşturur — yalnızca "yuva arıyor" durumundaki hayvanlar için. */
    action applyForAdoption(animalID : UUID,
                            firstName : String(60),
                            lastName : String(60),
                            email : String(254),
                            phone : String(20),
                            city : String(60),
                            housingType : String(10),
                            hasGarden : Boolean,
                            otherPets : String(200),
                            experience : String(1000),
                            householdAgrees : Boolean,
                            consentGiven : Boolean) returns String;

    /** Etkinliğe kayıt — kapasite sunucuda atomik olarak kontrol edilir. */
    action registerForEvent(eventID : UUID,
                            name : String(100),
                            email : String(254),
                            phone : String(20),
                            consentGiven : Boolean) returns String;

    /** İletişim formu mesajı oluşturur. */
    action sendContactMessage(name : String(100),
                              email : String(254),
                              subject : String(150),
                              message : String(2000),
                              consentGiven : Boolean) returns String;
}
