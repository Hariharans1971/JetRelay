"""Reject literal PostgreSQL passwords without printing their values.

Complements Gitleaks; does not replace a full secret scanner or credential audit.
"""
import re
import subprocess
from pathlib import Path

DATABASE_PASSWORD = re.compile(r"postgres(?:ql)?://[^\s/@:'\"`]+:[^\s/@'\"`]+@", re.IGNORECASE)


def credential_lines(text):
    return [number for number, line in enumerate(text.splitlines(), 1)
            if DATABASE_PASSWORD.search(line)]


def main():
    paths = subprocess.check_output(['git', 'ls-files', '-z']).split(b'\0')
    findings = []
    for raw_path in paths:
        if not raw_path:
            continue
        path = Path(raw_path.decode())
        if not path.is_file() or path.is_symlink():
            continue
        for line in credential_lines(path.read_bytes().decode('latin1')):
            findings.append(f'{path}:{line}: literal PostgreSQL password; use a runtime secret or generated test value')
    for finding in findings:
        print(finding)
    if findings:
        raise SystemExit(1)
    print('No literal PostgreSQL passwords in tracked files.')


if __name__ == '__main__':
    main()
