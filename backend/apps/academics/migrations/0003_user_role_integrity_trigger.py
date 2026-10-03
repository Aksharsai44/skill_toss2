from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION academics_validate_user_role_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
    IF EXISTS (
      SELECT 1 FROM academics_teacherassignment assignment
      WHERE assignment.teacher_id = NEW.id
        AND (NEW.role <> 'teacher' OR NEW.institution_id IS DISTINCT FROM assignment.institution_id)
    ) THEN
      RAISE EXCEPTION 'teacher assignments must be removed before changing role or institution'
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM academics_studentenrollment enrollment
      WHERE enrollment.student_id = NEW.id
        AND (NEW.role <> 'student' OR NEW.institution_id IS DISTINCT FROM enrollment.institution_id)
    ) THEN
      RAISE EXCEPTION 'student enrollments must be removed before changing role or institution'
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM academics_parentstudentlink link
      WHERE link.parent_id = NEW.id
        AND (NEW.role <> 'parent' OR NEW.institution_id IS DISTINCT FROM link.institution_id)
    ) THEN
      RAISE EXCEPTION 'parent links must be removed before changing role or institution'
        USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM academics_parentstudentlink link
      WHERE link.student_id = NEW.id
        AND (NEW.role <> 'student' OR NEW.institution_id IS DISTINCT FROM link.institution_id)
    ) THEN
      RAISE EXCEPTION 'child links must be removed before changing role or institution'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER academics_user_role_integrity
BEFORE UPDATE OF role, institution_id ON accounts_user
FOR EACH ROW EXECUTE FUNCTION academics_validate_user_role_change();

REVOKE ALL ON FUNCTION academics_validate_user_role_change() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS academics_user_role_integrity ON accounts_user;
DROP FUNCTION IF EXISTS academics_validate_user_role_change();
"""


class Migration(migrations.Migration):
    dependencies = [("academics", "0002_academic_integrity_triggers")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
