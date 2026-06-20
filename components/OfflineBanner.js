"use client";

import { useEffect, useState } from "react";

// Shows a small banner when the device has no internet, telling the user they
// can still browse info and make phone calls (which don't need internet).
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status">
      📴 অফলাইন — তথ্য দেখুন ও ফোন করুন
    </div>
  );
}
