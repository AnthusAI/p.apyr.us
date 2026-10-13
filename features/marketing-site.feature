Feature: Papyrus marketing site at the root
  The root page of p.apyr.us explains Papyrus and offers four ways to adopt it.

  Scenario: The four-tier pricing ladder
    Given the marketing pricing tiers
    Then they are, in order, "Fork it" at "No cost", "Self-setup, managed" at "$20 a month", "Assisted setup, managed" at "$20 a month" with "and $100 once", and "Professional services" at "Quoted"

  Scenario: Links
    Given the marketing page
    Then it links to the newspaper at "/information" and to the source on GitHub

  Scenario: The waitlist is hidden
    Given the marketing page
    Then the waitlist form and every link to it are omitted until a real waitlist system exists

  Scenario: The marketing styles are scoped
    Given the marketing stylesheet
    Then every rule is under the "papyrus-marketing" wrapper and none targets body or html
