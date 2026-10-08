Feature: Legacy newspaper paths redirect to the information mount
  The newspaper moved from the site root to /information. Old links keep working.

  Scenario: An old dated URL answers with a permanent redirect to the information equivalent
    Given the legacy path "/2026/october/07"
    When the redirect table is evaluated
    Then the destination is "/information/2026/october/07"
    And the redirect is permanent

  Scenario: An old dated page, section and article URL keep their trailing segments
    Given the legacy path "/2026/october/07/page/2"
    Then the destination is "/information/2026/october/07/page/2"

  Scenario: An old article URL answers with a permanent redirect
    Given the legacy path "/articles/example-slug"
    Then the destination is "/information/articles/example-slug"

  Scenario: The archive and settings pages move
    Given the legacy paths "/archive" and "/settings"
    Then each destination is the same path under "/information"

  Scenario: The newsroom does not redirect
    Given the path "/newsroom"
    Then no redirect rule matches

  Scenario: The marketing root is not redirected
    Given the path "/"
    Then no redirect rule matches

  Scenario: The API does not redirect
    Given the path "/api/media/example"
    Then no redirect rule matches
