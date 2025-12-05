"use client";

import { logVisitor } from "@/actions/supabase/post";
import { useEffect, useRef } from "react";

export function VisitorTracker() {
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true;

      // Check for existing visitor ID or create new one
      let visitorId = localStorage.getItem("keep_ph_visitor_id");

      if (!visitorId) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          visitorId = crypto.randomUUID();
        } else {
          // Fallback UUID generator
          visitorId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
              const r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }
          );
        }
        localStorage.setItem("keep_ph_visitor_id", visitorId);
      }

      logVisitor(
        visitorId,
        navigator.userAgent,
        "website",
        window.location.pathname
      ).catch(console.error);
    }
  }, []);

  return null;
}
