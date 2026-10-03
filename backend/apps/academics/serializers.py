from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User, UserRole

from .models import (
    Batch,
    BatchStatus,
    Course,
    Department,
    EnrollmentStatus,
    ParentStudentLink,
    StudentEnrollment,
    Subject,
    TeacherAssignment,
)


class InstitutionSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)


class DepartmentSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)

    class Meta:
        model = Department
        fields = ("id", "institution", "name", "code", "is_active", "created_at", "updated_at")
        read_only_fields = fields


class CourseSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Course
        fields = (
            "id", "institution", "department", "department_name", "code", "title",
            "description", "is_active", "created_at", "updated_at",
        )
        read_only_fields = fields


class SubjectSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Subject
        fields = (
            "id", "institution", "course", "course_title", "code", "title", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class UserSummarySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name", read_only=True)

    class Meta:
        model = User
        fields = ("id", "name", "email")
        read_only_fields = fields


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    teacher_details = UserSummarySerializer(source="teacher", read_only=True)
    teacher = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    teacher_id = serializers.UUIDField(source="teacher.id", read_only=True)

    class Meta:
        model = TeacherAssignment
        fields = (
            "id", "institution", "batch", "teacher", "teacher_id", "teacher_details", "subject",
            "is_primary", "is_active", "assigned_at",
        )
        read_only_fields = ("id", "institution", "assigned_at", "teacher_details")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        batch = attrs.get("batch", getattr(instance, "batch", None))
        teacher = attrs.get("teacher", getattr(instance, "teacher", None))
        subject = attrs.get("subject", getattr(instance, "subject", None))
        is_active = attrs.get("is_active", getattr(instance, "is_active", True))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("batch", "teacher", "subject")
        ):
            errors["non_field_errors"] = "Assignment ownership fields cannot be changed."
        if batch and batch.institution_id != actor.institution_id:
            errors["batch"] = "Batch must belong to your institution."
        if teacher and teacher.role != UserRole.TEACHER:
            errors["teacher"] = "Teacher assignments require a teacher user."
        elif batch and teacher and teacher.institution_id != batch.institution_id:
            errors["teacher"] = "Teacher and batch must share an institution."
        elif is_active and teacher and not teacher.is_active:
            errors["teacher"] = "An active assignment requires an active teacher."
        if is_active and batch and batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "An active assignment requires an active batch."
        if subject and batch and (subject.course_id != batch.course_id or not subject.is_active):
            errors["subject"] = "Subject must be active and belong to the batch course."
        if batch and teacher:
            duplicate = TeacherAssignment.objects.filter(batch=batch, teacher=teacher, subject=subject)
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                errors["non_field_errors"] = "This teacher assignment already exists."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student_details = UserSummarySerializer(source="student", read_only=True)
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    student_id = serializers.UUIDField(source="student.id", read_only=True)

    class Meta:
        model = StudentEnrollment
        fields = (
            "id", "institution", "batch", "student", "student_id", "student_details", "status",
            "enrolled_at", "removed_at",
        )
        read_only_fields = ("id", "institution", "enrolled_at", "removed_at", "student_details")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        batch = attrs.get("batch", getattr(instance, "batch", None))
        student = attrs.get("student", getattr(instance, "student", None))
        status_value = attrs.get("status", getattr(instance, "status", EnrollmentStatus.ACTIVE))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("batch", "student")
        ):
            errors["non_field_errors"] = "Enrollment ownership fields cannot be changed."
        if batch and batch.institution_id != actor.institution_id:
            errors["batch"] = "Batch must belong to your institution."
        if student and student.role != UserRole.STUDENT:
            errors["student"] = "Student enrollment requires a student user."
        elif batch and student and student.institution_id != batch.institution_id:
            errors["student"] = "Student and batch must share an institution."
        elif status_value == EnrollmentStatus.ACTIVE and student and not student.is_active:
            errors["student"] = "An active enrollment requires an active student."
        if status_value == EnrollmentStatus.ACTIVE and batch and batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "An active enrollment requires an active batch."
        if batch and student:
            duplicate = StudentEnrollment.objects.filter(batch=batch, student=student)
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                errors["non_field_errors"] = "This student enrollment already exists."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def update(self, instance, validated_data):
        if validated_data.get("status") == EnrollmentStatus.REMOVED:
            validated_data["removed_at"] = timezone.now()
        elif validated_data.get("status") == EnrollmentStatus.ACTIVE:
            validated_data["removed_at"] = None
        return super().update(instance, validated_data)


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    parent_details = UserSummarySerializer(source="parent", read_only=True)
    student_details = UserSummarySerializer(source="student", read_only=True)
    parent = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    parent_id = serializers.UUIDField(source="parent.id", read_only=True)
    student_id = serializers.UUIDField(source="student.id", read_only=True)

    class Meta:
        model = ParentStudentLink
        fields = (
            "id", "institution", "parent", "parent_id", "parent_details", "student", "student_id", "student_details",
            "relationship", "is_primary", "created_at",
        )
        read_only_fields = ("id", "institution", "created_at", "parent_details", "student_details")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        parent = attrs.get("parent", getattr(instance, "parent", None))
        student = attrs.get("student", getattr(instance, "student", None))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("parent", "student")
        ):
            errors["non_field_errors"] = "Parent-link ownership fields cannot be changed."
        if parent and parent.institution_id != actor.institution_id:
            errors["parent"] = "Parent must belong to your institution."
        if parent and parent.role != UserRole.PARENT:
            errors["parent"] = "Parent links require a parent user."
        if student and student.role != UserRole.STUDENT:
            errors["student"] = "Linked child must be a student user."
        if parent and student and parent.institution_id != student.institution_id:
            errors["student"] = "Parent and student must share an institution."
        if parent and student:
            duplicate = ParentStudentLink.objects.filter(parent=parent, student=student)
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                errors["non_field_errors"] = "This parent-child link already exists."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class BatchSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    department = serializers.UUIDField(source="course.department_id", read_only=True)
    department_name = serializers.CharField(source="course.department.name", read_only=True)
    teachers = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = (
            "id", "institution", "course", "course_code", "course_title", "department",
            "department_name", "name", "schedule", "status", "archived_at", "created_at",
            "updated_at", "teachers", "students",
        )
        read_only_fields = (
            "id", "institution", "course_code", "course_title", "department", "department_name",
            "archived_at", "created_at", "updated_at", "teachers", "students",
        )

    def get_teachers(self, obj):
        items = getattr(obj, "visible_teacher_assignments", [])
        return TeacherAssignmentSerializer(items, many=True).data

    def get_students(self, obj):
        items = getattr(obj, "visible_student_enrollments", [])
        return StudentEnrollmentSerializer(items, many=True).data

    def validate(self, attrs):
        instance = self.instance
        request = self.context["request"]
        course = attrs.get("course", getattr(instance, "course", None))
        status_value = attrs.get("status", getattr(instance, "status", BatchStatus.ACTIVE))
        if instance and "course" in attrs and course != instance.course:
            raise serializers.ValidationError({"course": "A batch cannot be moved to another course."})
        if course and course.institution_id != request.user.institution_id:
            raise serializers.ValidationError({"course": "Course must belong to your institution."})
        name = attrs.get("name", getattr(instance, "name", ""))
        if status_value == BatchStatus.ACTIVE and name:
            duplicate = Batch.objects.filter(
                institution_id=request.user.institution_id,
                name__iexact=name,
                status=BatchStatus.ACTIVE,
            )
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError({"name": "An active batch with this name already exists."})
        if status_value == BatchStatus.ARCHIVED:
            attrs["archived_at"] = getattr(instance, "archived_at", None) or timezone.now()
        else:
            attrs["archived_at"] = None
        return attrs
