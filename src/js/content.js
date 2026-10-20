import { initMonitoring } from '../lib/monitoring.js';
initMonitoring('content');
const DEFAULT_CONTENT = {
  site: {
    eyebrow: "We're getting married",
    storyTitle: "Our Story",
    storySub: "A journey of love, laughter and a lifetime together",
    detailsTitle: "Event Details",
    detailsSub: "When & where we celebrate",
    galleryTitle: "Gallery",
    gallerySub: "Moments we cherish",
    partyTitle: "Wedding Party",
    partySub: "The ones standing beside us",
    rsvpTitle: "RSVP",
    rsvpSub: "Kindly respond by November 30, 2026",
    faqTitle: "FAQ",
    faqSub: "Good to know",
    guestbookTitle: "Guest Book",
    guestbookSub: "Leave a note for the couple",
    footerMessage: "With love, we can't wait to celebrate with you."
  },
  couple: {
    groom: "Astonie",
    bride: "Wanangwa",
    dateISO: "2026-12-06T14:00:00",
    dateDisplay: "December 6, 2026",
    dayOfWeek: "Sunday",
    location: "Blantyre, Malawi",
    venue: "Golden Peacock Hotel",
    hashtag: "#AstonieAndWanangwa",
    rsvpDeadline: "November 30, 2026"
  },
  media: {
    heroImage: "",
    coverImage: "",
    playlist: [
      { title: "Love Song", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
    ]
  },
  invitation: {
    eyebrow: "You are cordially invited",
    title: "to the wedding of",
    message: "Together with our families, we invite you to share in our joy as we unite in marriage.",
    rsvpText: "RSVP Now"
  },
  story: [
    { year: "2019", title: "First Meeting", text: "A chance encounter that changed everything. One conversation turned into a thousand." },
    { year: "2021", title: "First Trip Together", text: "Exploring the shores of Lake Malawi, we knew this was forever." },
    { year: "2024", title: "The Proposal", text: "Under a sky full of stars, a question was asked and answered with a joyful yes." },
    { year: "2026", title: "The Wedding", text: "Surrounded by the people we love most, we begin our forever." }
  ],
  details: [
    { title: "Ceremony", time: "2:00 PM", place: "Golden Peacock Hotel", address: "Blantyre, Malawi", mapUrl: "https://maps.google.com/?q=Golden+Peacock+Hotel+Blantyre" },
    { title: "Reception", time: "5:00 PM", place: "Golden Peacock Hotel", address: "Blantyre, Malawi", mapUrl: "https://maps.google.com/?q=Golden+Peacock+Hotel+Blantyre" }
  ],
  gallery: [
    "https://picsum.photos/seed/aw1/600/600",
    "https://picsum.photos/seed/aw2/600/600",
    "https://picsum.photos/seed/aw3/600/600",
    "https://picsum.photos/seed/aw4/600/600",
    "https://picsum.photos/seed/aw5/600/600",
    "https://picsum.photos/seed/aw6/600/600",
    "https://picsum.photos/seed/aw7/600/600",
    "https://picsum.photos/seed/aw8/600/600"
  ],
  party: [
    { initial: "J", name: "James Banda", role: "Best Man", note: "Brother of the groom" },
    { initial: "M", name: "Mercy Phiri", role: "Maid of Honor", note: "Best friend of the bride" },
    { initial: "D", name: "Daniel Chirwa", role: "Groomsman", note: "Childhood friend" },
    { initial: "G", name: "Grace Mwale", role: "Bridesmaid", note: "Sister of the bride" }
  ],
  faq: [
    { q: "What is the dress code?", a: "Semi-formal. We suggest earthy tones, sage, champagne and rose. Please avoid white." },
    { q: "Is there parking?", a: "Yes, free parking is available at the venue." },
    { q: "Are children welcome?", a: "We love your little ones, but this will be an adults-only celebration." },
    { q: "Can I take photos?", a: "Please share on socials with #AstonieAndWanangwa. Our photographer will capture the ceremony." },
    { q: "What about gifts?", a: "Your presence is the greatest gift. If you wish, a honeymoon fund is available." }
  ]
};

function mergeDefaults(saved) {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  if (!saved) return base;
  return {
    site: Object.assign(base.site, saved.site || {}),
    couple: Object.assign(base.couple, saved.couple || {}),
    media: Object.assign(base.media, saved.media || {}),
    invitation: Object.assign(base.invitation, saved.invitation || {}),
    story: saved.story || base.story,
    details: saved.details || base.details,
    gallery: saved.gallery || base.gallery,
    party: saved.party || base.party,
    faq: saved.faq || base.faq,
  };
}
function getContent() {
  try {
    const raw = localStorage.getItem('weddingContent');
    if (raw) return mergeDefaults(JSON.parse(raw));
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
}
function saveContent(c) {
  try {
    localStorage.setItem('weddingContent', JSON.stringify(c));
    return true;
  } catch (e) {
    console.error('Save failed', e);
    return false;
  }
}
function resetContent() { localStorage.removeItem('weddingContent'); }

window.WeddingContent = { DEFAULT_CONTENT, getContent, saveContent, resetContent, mergeDefaults };
