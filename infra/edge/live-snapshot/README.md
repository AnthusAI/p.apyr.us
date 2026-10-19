# Live edge snapshot (2026-10-19, read-only capture)

Captured with read-only AWS calls (cloudformation get-template and describe-stack-resources, cloudfront get-distribution-config, get-function, describe-function). Nothing was changed.

Which distribution belongs to which stack:

| Distribution | Aliases | Origin | Viewer-request function | In stack papyrus-edge-p-apyr-us |
| --- | --- | --- | --- | --- |
| E2QW8WOFWQT0H4 | none | main app | papyrus-edge-p-apyr-us-forward-host | yes |
| E28MOJ7T494DCX | p-staging.apyr.us | staging app | papyrus-edge-p-apyr-us-forward-host | yes |
| E17ZRAI87DN065 | p.apyr.us, apyr.us | main app | papyrus-legacy-reader-redirect | no (tag Project=Papyrus-web) |
| E2EM0JLBC2W9WW | read.p.apyr.us | main app | papyrus-reader-edge | no |

The two functions that still redirect to `/information` (`papyrus-reader-edge`, `papyrus-legacy-reader-redirect`) and the two distributions that use them are not in the stack. See the `.live.js` files for the current code and the `.describe.json` files for their ETags and stages.
