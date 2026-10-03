# Architecture rules

- The app is a multi-cert reviewer. Each certification ("track": cc, cissp, secai) is defined once in src/lib/questions.ts (TRACKS registry) with its banks, pass mark, and mode config; new certs = new src/data/*.json bank + one registry entry. Question ids MUST be prefixed with their track (cc ids stay unprefixed for legacy data) so attempts/mastery rows stay unambiguous.
