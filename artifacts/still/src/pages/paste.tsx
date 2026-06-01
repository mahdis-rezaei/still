import { useState } from "react";
import { useLocation } from "wouter";
import { useStill } from "@/lib/store";

const SAMPLE_ENTRIES = `[2015-08-24]
Today is Monday. I feel lost, lazy, messed up — up down down up. Mom and dad are at the airport. I don't have a job and dad has to support me. Relax Mahdis, relax. Take a deep breath. One, two, three.

[2015-11-18]
3:53am at the monastery. They just woke us up. I had an awkward dream, probably because I was trying to find out why I'm so scared of being alone, especially alone in the dark. Yesterday's sitting was intense. My body is exhausted but I'm getting more comfortable.

[2018-03-29]
It doesn't matter what anyone says you can or can't do. When writing the story of YOUR life, make sure YOU hold the pen. Be brave when writing YOUR script.

[2018-08-06]
You should believe in yourself. Mahdis you are extraordinary. You just need to take the first step. You can get good at anything you put your mind to.

[2020-03-22]
What do you want to accomplish in 2020? Why can't I dream big? What is blocking me? Why am I scared? What is wrong Mahdis? Something is blocking me.

[2021-08-12]
You got this Warrior. You got this. I have come such a long way. My imposter syndrome is high but Mahdis, look how far you've come.

[2026-05-25]
Hey you! What is it? I feel stressed. I feel like I'm moving so slow now, hiding behind the bushes. But why? I'm scared. You can do it Mahdis.`;

export default function Paste() {
  const [, setLocation] = useLocation();
  const { entries, setEntries } = useStill();

  const handleUseSample = () => {
    setEntries(SAMPLE_ENTRIES);
  };

  const handleSubmit = () => {
    if (!entries.trim()) return;
    setLocation("/processing");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 max-w-[680px] mx-auto py-12 md:py-24">
      <h1 className="font-display text-4xl text-deep-brown mb-4">
        Bring a few pages.
      </h1>
      <p className="text-lg text-soft-ink mb-8 leading-relaxed">
        Paste 20–30 dated entries from different moments in your life. Messy is fine. The dates matter.
      </p>
      
      <div className="flex-1 flex flex-col gap-6 mb-8">
        <textarea
          value={entries}
          onChange={(e) => setEntries(e.target.value)}
          placeholder="[2015-08-24]\nToday I felt..."
          className="w-full flex-1 min-h-[400px] bg-surface border border-border rounded-sm p-6 text-lg text-ink font-body placeholder:text-faint-ink focus:outline-none focus:ring-1 focus:ring-accent-sepia resize-none shadow-sm"
        />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleSubmit}
            disabled={!entries.trim()}
            className="w-full sm:w-auto bg-ink hover:bg-deep-brown disabled:bg-faint-ink text-surface px-8 py-3 rounded-sm font-body text-lg transition-colors"
          >
            Find what's worth returning to
          </button>
          
          <button
            onClick={handleUseSample}
            className="text-accent-sepia hover:text-deep-brown font-body text-lg underline decoration-accent-sepia/30 underline-offset-4"
          >
            Use sample entries
          </button>
        </div>
      </div>
    </div>
  );
}
