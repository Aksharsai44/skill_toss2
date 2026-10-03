import getpass
from datetime import date, datetime, timezone as datetime_timezone

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Institution, UserRole


TEST_USERS = (
    (UserRole.SUPER_ADMIN, "superadmin@skilltoss.test", "SkillToss Super Admin"),
    (UserRole.PRODUCT_ADMIN, "productadmin@skilltoss.test", "SkillToss Product Admin"),
    (UserRole.ADMIN, "admin@skilltoss.test", "SkillToss Admin"),
    (UserRole.TEACHER, "teacher@skilltoss.test", "SkillToss Teacher"),
    (UserRole.STUDENT, "student@skilltoss.test", "SkillToss Student"),
    (UserRole.PARENT, "parent@skilltoss.test", "SkillToss Parent"),
)


class Command(BaseCommand):
    help = "Provision the six local development roles with a runtime-supplied password."

    def add_arguments(self, parser):
        parser.add_argument("--password-env", default="SKILLTOSS_TEST_USER_PASSWORD")
        parser.add_argument("--institution-code", default="STDC")
        parser.add_argument("--institution-name", default="Skill Toss Demo College")

    @transaction.atomic
    def handle(self, *args, **options):
        import os

        password = os.getenv(options["password_env"]) or getpass.getpass("Test-user password: ")
        if not password:
            raise CommandError("A non-empty password is required.")

        institution, _ = Institution.objects.get_or_create(
            code=options["institution_code"],
            defaults={"name": options["institution_name"], "is_active": True},
        )
        Institution.objects.get_or_create(
            code="STSC",
            defaults={"name": "Skill Toss Secondary College", "is_active": True},
        )
        User = get_user_model()
        provisioned_users = {}
        for role, email, name in TEST_USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": name,
                    "role": role,
                    "institution": None if role == UserRole.PRODUCT_ADMIN else institution,
                    "is_active": True,
                },
            )
            if not created:
                user.full_name = name
                user.role = role
                user.institution = None if role == UserRole.PRODUCT_ADMIN else institution
                user.is_active = True
            user.set_password(password)
            user.full_clean(exclude={"password"})
            user.save()
            provisioned_users[role] = user
            self.stdout.write(f"{'Created' if created else 'Updated'} {email} ({role})")

        from apps.academics.models import (
            Batch,
            BatchStatus,
            Course,
            Department,
            ParentStudentLink,
            StudentEnrollment,
            Subject,
            TeacherAssignment,
        )

        department, _ = Department.objects.update_or_create(
            institution=institution,
            code="CSE",
            defaults={"name": "Computer Science", "is_active": True},
        )
        course, _ = Course.objects.update_or_create(
            institution=institution,
            code="BSC-CS",
            defaults={
                "department": department,
                "title": "B.Sc. Computer Science",
                "description": "SkillToss development fixture",
                "is_active": True,
            },
        )
        subject, _ = Subject.objects.update_or_create(
            course=course,
            code="CS101",
            defaults={
                "institution": institution,
                "title": "Programming Fundamentals",
                "is_active": True,
            },
        )
        batch, _ = Batch.objects.update_or_create(
            institution=institution,
            name="CSE Development A",
            defaults={
                "course": course,
                "schedule": "Mon-Fri 09:00-11:00",
                "status": BatchStatus.ACTIVE,
                "archived_at": None,
            },
        )
        TeacherAssignment.objects.update_or_create(
            batch=batch,
            teacher=provisioned_users[UserRole.TEACHER],
            subject=subject,
            defaults={"institution": institution, "is_primary": True, "is_active": True},
        )
        StudentEnrollment.objects.update_or_create(
            batch=batch,
            student=provisioned_users[UserRole.STUDENT],
            defaults={"institution": institution, "status": "active", "removed_at": None},
        )
        ParentStudentLink.objects.update_or_create(
            parent=provisioned_users[UserRole.PARENT],
            student=provisioned_users[UserRole.STUDENT],
            defaults={"institution": institution, "relationship": "Parent", "is_primary": True},
        )

        from apps.learning.models import (
            Assignment,
            AssignmentStatus,
            AttendanceRecord,
            AttendanceSession,
            AttendanceSessionStatus,
            AttendanceStatus,
            Submission,
            SubmissionStatus,
        )

        attendance_session, _ = AttendanceSession.objects.update_or_create(
            batch=batch,
            subject=subject,
            attendance_date=date(2026, 9, 29),
            defaults={
                "institution": institution,
                "status": AttendanceSessionStatus.OPEN,
                "notes": "SkillToss development fixture",
                "created_by": provisioned_users[UserRole.TEACHER],
            },
        )
        AttendanceRecord.objects.update_or_create(
            session=attendance_session,
            student=provisioned_users[UserRole.STUDENT],
            defaults={
                "institution": institution,
                "status": AttendanceStatus.PRESENT,
                "marked_by": provisioned_users[UserRole.TEACHER],
            },
        )
        learning_assignment, _ = Assignment.objects.update_or_create(
            batch=batch,
            subject=subject,
            title="Programming Fundamentals Exercise",
            defaults={
                "institution": institution,
                "instructions": "Submit a short explanation and solution.",
                "due_at": datetime(2035, 1, 15, 12, 0, tzinfo=datetime_timezone.utc),
                "max_marks": 20,
                "status": AssignmentStatus.PUBLISHED,
                "created_by": provisioned_users[UserRole.TEACHER],
            },
        )
        submission, _ = Submission.objects.get_or_create(
            assignment=learning_assignment,
            student=provisioned_users[UserRole.STUDENT],
            defaults={
                "institution": institution,
                "response": "Development fixture response",
                "status": SubmissionStatus.SUBMITTED,
                "submitted_at": datetime(2026, 9, 29, 10, 0, tzinfo=datetime_timezone.utc),
            },
        )
        submission.status = SubmissionStatus.GRADED
        submission.marks = 18
        submission.feedback = "Strong work."
        submission.graded_by = provisioned_users[UserRole.TEACHER]
        submission.graded_at = datetime(2026, 9, 29, 11, 0, tzinfo=datetime_timezone.utc)
        submission.save()

        from apps.tracker.models import DailyGoal, DailyTask, GoalStatus, TaskStatus

        daily_goal, _ = DailyGoal.objects.update_or_create(
            student=provisioned_users[UserRole.STUDENT],
            title="Complete the programming practice set",
            defaults={
                "institution": institution,
                "category": "Academics",
                "target": "Finish all exercises",
                "target_date": date(2035, 1, 10),
                "status": GoalStatus.ACTIVE,
            },
        )
        DailyTask.objects.update_or_create(
            student=provisioned_users[UserRole.STUDENT],
            goal=daily_goal,
            activity_date=date(2026, 9, 29),
            title="Solve the first programming exercise",
            defaults={
                "institution": institution,
                "status": TaskStatus.PENDING,
            },
        )

        from apps.resources.models import LearningResource, NoteFile, StudentNote

        student_note, _ = StudentNote.objects.update_or_create(
            student=provisioned_users[UserRole.STUDENT],
            title="Programming revision",
            defaults={
                "institution": institution,
                "content": "Review variables, conditions, and loops.",
            },
        )
        if not student_note.files.exists():
            NoteFile.objects.create(
                note=student_note,
                student=provisioned_users[UserRole.STUDENT],
                file_name="revision.txt",
                mime_type="text/plain",
                file_size=len(b"SkillToss revision fixture\n"),
                file=ContentFile(b"SkillToss revision fixture\n", name="revision.txt"),
            )
        if not LearningResource.objects.filter(
            batch=batch, title="Programming Fundamentals Guide"
        ).exists():
            LearningResource.objects.create(
                batch=batch,
                subject=subject,
                title="Programming Fundamentals Guide",
                description="Small text resource for local development verification.",
                uploaded_by=provisioned_users[UserRole.TEACHER],
                file_name="programming-guide.txt",
                mime_type="text/plain",
                file_size=len(b"SkillToss programming guide fixture\n"),
                file=ContentFile(
                    b"SkillToss programming guide fixture\n", name="programming-guide.txt"
                ),
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Provisioned all six development roles and the academic, learning, tracker, and resource fixtures."
            )
        )
