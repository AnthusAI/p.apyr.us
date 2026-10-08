"use client";

import { FormEvent, useState } from "react";

export function Waitlist() {
  const [designPreviewShown, setDesignPreviewShown] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDesignPreviewShown(true);
  }

  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="pm-section pm-waitlist">
      <div className="pm-container pm-waitlist-grid">
        <div>
          <p className="pm-kicker">Early access</p>
          <h2 id="waitlist-title" className="pm-heading">Bring us a beat worth remembering.</h2>
          <p className="pm-lede">
            Tell us what you want to cover and how you imagine running it. Joining the wait-list does not commit you to a plan or to paying us anything.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="pm-form" aria-describedby="waitlist-note">
          <label htmlFor="waitlist-email">Work email</label>
          <input id="waitlist-email" name="email" type="email" required />
          <label htmlFor="waitlist-beat">What would your publication cover?</label>
          <input id="waitlist-beat" name="beat" placeholder="A place, an industry, a public institution" required />
          <label htmlFor="waitlist-path">How do you want to begin?</label>
          <select id="waitlist-path" name="path" defaultValue="exploring">
            <option value="exploring">I am still exploring</option>
            <option value="self">I want to run it myself</option>
            <option value="setup">I want help setting it up</option>
            <option value="managed">I want Anthus to manage it</option>
          </select>
          <button type="submit" className="pm-button pm-button-primary">Join the wait-list</button>
          <p id="waitlist-note" className="pm-note">
            Design preview: submissions are not connected yet, so nothing you type here is sent or stored.
          </p>
          {designPreviewShown ? <p role="status" className="pm-status">The form design works. No information was sent or stored.</p> : null}
        </form>
      </div>
    </section>
  );
}
