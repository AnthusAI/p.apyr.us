Feature: Papyrus marketing site at the root
  The root page of p.apyr.us explains Papyrus and offers four ways to adopt it.

  Scenario: The shared four-rung pricing ladder
    Given the marketing pricing tiers in one data file
    Then they are, in order, "Open source" at "Free", "Hosted" at "$20/mo" per publication, "Dedicated" at "$300/mo" with "$1,000 once" onboarding, and "Engagement" at "From $2,500/mo"
    And every tier records its product, rung, title, price, availability and call to action

  Scenario: Availability chips come from the data file
    Given the "Hosted" tier is marked early-access
    Then its card shows an "Early access" chip, a "Request access" call to action pointing at https://anth.us/engage/, and its price is qualified as planned
    And available tiers show no chip

  Scenario: The shared payment answers
    Given the pricing questions
    Then they explain who pays for what on each rung and what happens when you stop paying

  Scenario: Links
    Given the marketing page
    Then it links to the newspaper at "/information" and to the source on GitHub

  Scenario: The waitlist is hidden
    Given the marketing page
    Then the waitlist form and every link to it are omitted until a real waitlist system exists

  Scenario: The marketing styles are scoped
    Given the marketing stylesheet
    Then every rule is under the "papyrus-marketing" wrapper and none targets body or html
