from django.contrib import admin

from .models import AssignmentResource, LearningResource, NoteFile, StudentNote, SubmissionAttachment


admin.site.register((StudentNote, NoteFile, LearningResource, AssignmentResource, SubmissionAttachment))
