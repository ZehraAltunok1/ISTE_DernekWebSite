using pg from '../db/schema';
using from '../db/codes';
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
