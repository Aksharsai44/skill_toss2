from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION resources_validate_student_note()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    WHERE student.id = NEW.student_id AND student.role = 'student' AND student.is_active
      AND student.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'note owner must be an active student in the same institution' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id OR NEW.student_id <> OLD.student_id
  ) THEN
    RAISE EXCEPTION 'note ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION resources_validate_note_file()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF position('..' in NEW.file) > 0 OR NEW.file LIKE '/%' THEN
    RAISE EXCEPTION 'unsafe private file path' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM resources_studentnote note
    JOIN accounts_user student ON student.id = note.student_id
    WHERE note.id = NEW.note_id
      AND note.student_id = NEW.student_id
      AND note.institution_id = NEW.institution_id
      AND student.role = 'student' AND student.is_active
  ) THEN
    RAISE EXCEPTION 'note file must belong to the note student' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id OR NEW.note_id <> OLD.note_id
    OR NEW.student_id <> OLD.student_id OR NEW.file <> OLD.file
  ) THEN
    RAISE EXCEPTION 'note file ownership and path are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION resources_validate_learning_resource()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  IF position('..' in NEW.file) > 0 OR NEW.file LIKE '/%' THEN
    RAISE EXCEPTION 'unsafe private file path' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id OR target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'resource requires an active batch in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academics_subject subject
    WHERE subject.id = NEW.subject_id AND subject.institution_id = NEW.institution_id
      AND subject.course_id = target_batch.course_id AND subject.is_active
  ) THEN
    RAISE EXCEPTION 'resource subject must belong to the batch course' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.uploaded_by_id, NEW.batch_id) THEN
    RAISE EXCEPTION 'uploader cannot manage the resource batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id OR NEW.batch_id <> OLD.batch_id
    OR NEW.subject_id <> OLD.subject_id OR NEW.uploaded_by_id <> OLD.uploaded_by_id
    OR NEW.file <> OLD.file
  ) THEN
    RAISE EXCEPTION 'resource ownership and path are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION resources_validate_submission_file()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_submission learning_submission%ROWTYPE;
  target_assignment learning_assignment%ROWTYPE;
BEGIN
  IF position('..' in NEW.file) > 0 OR NEW.file LIKE '/%' THEN
    RAISE EXCEPTION 'unsafe private file path' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_submission FROM learning_submission WHERE id = NEW.submission_id;
  SELECT * INTO target_assignment FROM learning_assignment WHERE id = target_submission.assignment_id;
  IF target_submission.id IS NULL OR target_submission.institution_id <> NEW.institution_id
     OR NEW.uploaded_by_id <> target_submission.student_id THEN
    RAISE EXCEPTION 'submission file must be uploaded by its student owner' USING ERRCODE = '23514';
  END IF;
  IF target_submission.status = 'graded' OR target_assignment.status <> 'published'
     OR statement_timestamp() > target_assignment.due_at THEN
    RAISE EXCEPTION 'submission file upload is not currently allowed' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academics_studentenrollment enrollment
    JOIN accounts_user student ON student.id = enrollment.student_id
    WHERE enrollment.batch_id = target_assignment.batch_id
      AND enrollment.student_id = target_submission.student_id
      AND enrollment.status = 'active' AND student.is_active AND student.role = 'student'
  ) THEN
    RAISE EXCEPTION 'submission file requires active enrollment' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id OR NEW.submission_id <> OLD.submission_id
    OR NEW.uploaded_by_id <> OLD.uploaded_by_id OR NEW.file <> OLD.file
  ) THEN
    RAISE EXCEPTION 'submission file ownership and path are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resources_student_note_integrity
BEFORE INSERT OR UPDATE ON resources_studentnote
FOR EACH ROW EXECUTE FUNCTION resources_validate_student_note();
CREATE TRIGGER resources_note_file_integrity
BEFORE INSERT OR UPDATE ON resources_notefile
FOR EACH ROW EXECUTE FUNCTION resources_validate_note_file();
CREATE TRIGGER resources_learning_resource_integrity
BEFORE INSERT OR UPDATE ON resources_learningresource
FOR EACH ROW EXECUTE FUNCTION resources_validate_learning_resource();
CREATE TRIGGER resources_submission_file_integrity
BEFORE INSERT OR UPDATE ON resources_submissionattachment
FOR EACH ROW EXECUTE FUNCTION resources_validate_submission_file();

REVOKE ALL ON FUNCTION resources_validate_note_file() FROM PUBLIC;
REVOKE ALL ON FUNCTION resources_validate_student_note() FROM PUBLIC;
REVOKE ALL ON FUNCTION resources_validate_learning_resource() FROM PUBLIC;
REVOKE ALL ON FUNCTION resources_validate_submission_file() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS resources_submission_file_integrity ON resources_submissionattachment;
DROP TRIGGER IF EXISTS resources_learning_resource_integrity ON resources_learningresource;
DROP TRIGGER IF EXISTS resources_note_file_integrity ON resources_notefile;
DROP TRIGGER IF EXISTS resources_student_note_integrity ON resources_studentnote;
DROP FUNCTION IF EXISTS resources_validate_submission_file();
DROP FUNCTION IF EXISTS resources_validate_learning_resource();
DROP FUNCTION IF EXISTS resources_validate_note_file();
DROP FUNCTION IF EXISTS resources_validate_student_note();
"""


class Migration(migrations.Migration):
    dependencies = [("learning", "0003_fix_shared_trigger_column_access"), ("resources", "0001_initial")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
