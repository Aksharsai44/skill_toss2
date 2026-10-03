from django.contrib import admin

from .models import Batch, Course, Department, ParentStudentLink, StudentEnrollment, Subject, TeacherAssignment

admin.site.register((Department, Course, Subject, Batch, TeacherAssignment, StudentEnrollment, ParentStudentLink))
