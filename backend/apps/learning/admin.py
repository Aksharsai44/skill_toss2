from django.contrib import admin

from .models import Assignment, AttendanceRecord, AttendanceSession, Submission


admin.site.register((AttendanceSession, AttendanceRecord, Assignment, Submission))
