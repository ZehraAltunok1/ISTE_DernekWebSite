using pg from '../db/schema';
using from '../db/codes';
using from '../db/codes-events';
using from '../db/codes-gallery';
using from '../db/labels';

/**
 * Yönetim servisi — yalnızca 'admin' rolündeki kullanıcılar erişebilir.
 * Yetki kontrolü burada, deklaratif olarak yapılır; arayüzde buton gizlemek yetki sayılmaz.
 */
@requires: 'admin'
service AdminService {

    @odata.draft.enabled
    entity Campaigns             as projection on pg.Campaigns;

    /**
     * Bağışlar doğrudan düzenlenemez; durum yalnızca action'larla değişir.
     * Böylece "reddedilmiş bağışı onaylama" gibi geçersiz geçişler sunucuda engellenir.
     */
    @readonly
    entity Donations             as projection on pg.Donations
        actions {
            action confirm() returns Donations;
            action decline(reason : String(500) @mandatory) returns Donations;
        };

    @readonly
    entity VolunteerApplications as projection on pg.VolunteerApplications
        actions {
            action approve(note : String(500)) returns VolunteerApplications;
            action decline(note : String(500))  returns VolunteerApplications;
        };

    /** Hayvan ilanları — fotoğraflarıyla birlikte (composition) taslak olarak düzenlenir. */
    @odata.draft.enabled
    entity Animals               as projection on pg.Animals;

    /**
     * Sahiplenme başvuruları. Onaylanınca hayvan otomatik olarak "Rezerve" olur;
     * bu kural sunucudadır, arayüz yalnızca action'ı çağırır.
     */
    @readonly
    entity AdoptionApplications  as projection on pg.AdoptionApplications
        actions {
            action approve(note : String(500)) returns AdoptionApplications;
            action decline(note : String(500)) returns AdoptionApplications;
        };

    /** Galeri albümleri — fotoğraflarıyla birlikte (composition) taslak olarak düzenlenir. */
    @odata.draft.enabled
    entity Albums                as projection on pg.Albums;

    /** Etkinlikler — taslak olarak düzenlenir; kayıt sayısı yalnızca sunucuda değişir. */
    @odata.draft.enabled
    entity Events                as projection on pg.Events;

    /** Etkinlik kayıtları — ziyaretçiler oluşturur; yönetici yalnızca katılımı işaretler. */
    @readonly
    entity EventRegistrations    as projection on pg.EventRegistrations
        actions {
            action markAttended() returns EventRegistrations;
            action markAbsent()   returns EventRegistrations;
        };

    /** İletişim formundan gelen mesajlar — yalnızca okunur, durum action ile değişir. */
    @readonly
    entity ContactMessages       as projection on pg.ContactMessages
        actions {
            action markAnswered(note : String(500)) returns ContactMessages;
        };

    @odata.draft.enabled
    entity Announcements         as projection on pg.Announcements;

    @odata.draft.enabled
    entity Faqs                  as projection on pg.Faqs;

    @odata.draft.enabled
    entity SiteStats             as projection on pg.SiteStats;

    @readonly
    entity VolunteerAreas        as projection on pg.VolunteerAreas;
}
