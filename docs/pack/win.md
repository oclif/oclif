# `oclif pack:win`

create windows installer from oclif CLI

This command will produce unsigned installers unless you supply WINDOWS_SIGNING_PASS (prefixed with the name of your executable, e.g. OCLIF_WINDOWS_SIGNING_PASS) in the environment and have set the windows.name and windows.keypath properties in your package.json's oclif property.
