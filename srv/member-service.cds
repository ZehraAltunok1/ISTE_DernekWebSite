using pg from '../db/schema';
using from '../db/codes';
using from '../db/codes-events';

/**
 * Üye servisi — giriş yapmış kullanıcı yalnızca KENDİ kayıtlarını görür.
 *
 * "Kendi kaydı" kuralı arayüzde değil, burada @restrict ... where ile tanımlıdır:
 * CAP her sorguya "e-posta = oturumdaki kullanıcı" koşulunu kendisi ekler.
 * Başka birinin kaydını ID ile okumak 404, değiştirmek 403 döner.
 * ($user = mocked auth'taki kullanıcı adı = e-posta adresi; site formları e-postayı küçük harfle kaydeder.)
 */
@requires: 'authenticated-user'
service MemberService {

    type Me {
        email       : String;
        displayName : String;
        roles       : array of String;
    }

    /** Oturumu doğrular ve kullanıcının adını döner (giriş penceresi bunu çağırır). */
    function me() returns Me;

    /** Profil — ilk okumada yoksa oluşturulur (member-service.js). */
    @restrict: [{
        grant: ['READ', 'UPDATE'],
        where: 'email = $user'
    }]
    entity Profile                  as projection on pg.MemberProfiles;

    @readonly
    @restrict: [{
        grant: 'READ',
        where: 'donorEmail = $user'
    }]
    entity MyDonations              as
        projection on pg.Donations {
            ID,
            referenceCode,
            campaign.title as campaignTitle,
            amount,
            currency,
            method,
            status,
            createdAt,
            donorEmail,
            _status,
            _method
        };

    @readonly
    @restrict: [{
        grant: 'READ',
        where: 'email = $user'
    }]
    entity MyVolunteerApplications  as
        projection on pg.VolunteerApplications {
            ID,
            area.name as areaName,
            status,
            adminNote,
            createdAt,
            email,
            _status
        };

    @readonly
    @restrict: [{
        grant: 'READ',
        where: 'email = $user'
    }]
    entity MyAdoptionApplications   as
        projection on pg.AdoptionApplications {
            ID,
            animal.ID         as animalID,
            animal.name       as animalName,
            animal.coverImage as animalImage,
            status,
            adminNote,
            createdAt,
            email,
            _status
        };

    /** Etkinlik kayıtları — gelecekteki bir etkinliğin kaydı iptal edilebilir. */
    @readonly
    @restrict: [{
        grant: ['READ', 'cancel'],
        where: 'email = $user'
    }]
    entity MyEventRegistrations     as
        projection on pg.EventRegistrations {
            ID,
            event.ID            as eventID,
            event.title         as eventTitle,
            event.startDateTime as eventStart,
            event.location      as eventLocation,
            event.coverImage    as eventImage,
            event.status        as eventStatus,
            attendance,
            createdAt,
            email,
            _attendance
        }
        actions {
            action cancel();
        };
}
