namespace pg;

using {
    pg.EventCategory,
    pg.EventStatus,
    pg.Attendance,
    pg.Events,
    pg.EventRegistrations
} from './schema';

// Etkinlik kod tabloları — Türkçe metin ve renk (criticality: 0 nötr, 1 kırmızı, 2 turuncu, 3 yeşil)

@cds.autoexpose @readonly
entity EventCategoryTexts {
    key code : EventCategory;
        text : String(40);
        icon : String(60);
}

@cds.autoexpose @readonly
entity EventStatusTexts {
    key code        : EventStatus;
        text        : String(40);
        criticality : Integer;
}

@cds.autoexpose @readonly
entity AttendanceTexts {
    key code        : Attendance;
        text        : String(40);
        criticality : Integer;
}

extend Events with {
    _category : Association to one EventCategoryTexts on _category.code = category;
    _status   : Association to one EventStatusTexts on _status.code = status;
}

extend EventRegistrations with {
    _attendance : Association to one AttendanceTexts on _attendance.code = attendance;
}
