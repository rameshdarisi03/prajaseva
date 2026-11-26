'use client';

import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone, Share, PlusSquare, X, Info } from 'lucide-react';
import { IndianLanguage } from '@/lib/mgmtI18n';

interface PwaCopy {
  installBtn: string;
  installedBtn: string;
  installedGuideTitle: string;
  installedGuideDesc: string;
  iosGuideTitle: string;
  iosStep1: string;
  iosStep2: string;
  iosStep3: string;
  browserGuideTitle: string;
  browserGuideDesc: string;
  gotIt: string;
  subtitle: string;
}

const PWA_TRANSLATIONS: Record<IndianLanguage, PwaCopy> = {
  en: {
    installBtn: 'Install the App',
    installedBtn: 'App Installed',
    installedGuideTitle: 'App is Already Installed',
    installedGuideDesc: 'Praja Seva is already installed on your device. You can open it directly anytime from your Home Screen or App Drawer.',
    iosGuideTitle: 'Install Praja Seva on iPhone / iPad',
    iosStep1: 'Tap the Share button at the bottom of Safari.',
    iosStep2: 'Scroll down and tap "Add to Home Screen".',
    iosStep3: 'Tap "Add" at the top right to install.',
    browserGuideTitle: 'Install the App',
    browserGuideDesc: 'If the install popup did not appear, the app may already be installed on your device, or your current browser (such as an in-app browser) restricts direct install. Open in Chrome/Safari or check your Home Screen.',
    gotIt: 'Got it',
    subtitle: 'Quick 1-tap access from your home screen',
  },
  te: {
    installBtn: 'యాప్‌ను ఇన్‌స్టాల్ చేయండి',
    installedBtn: 'యాప్ ఇన్‌స్టాల్ చేయబడింది',
    installedGuideTitle: 'యాప్ ఇప్పటికే ఇన్‌స్టాల్ చేయబడింది',
    installedGuideDesc: 'ప్రజా సేవ యాప్ మీ ఫోన్‌లో ఇప్పటికే ఇన్‌స్టాల్ చేయబడింది. మీరు హోమ్ స్క్రీన్ లేదా యాప్ డ్రాయర్ నుండి నేరుగా ఓపెన్ చేయవచ్చు.',
    iosGuideTitle: 'iPhone / iPad లో ఇన్‌స్టాల్ చేయండి',
    iosStep1: 'Safari దిగువన ఉన్న Share బటన్‌ను నొక్కండి.',
    iosStep2: 'కిందికి స్క్రోల్ చేసి "Add to Home Screen" నొక్కండి.',
    iosStep3: 'కుడి వైపు పైన ఉన్న "Add" నొక్కి పూర్తి చేయండి.',
    browserGuideTitle: 'యాప్‌ను ఇన్‌స్టాల్ చేయండి',
    browserGuideDesc: 'ఇన్‌స్టాల్ పాప్‌అప్ రాకపోతే, యాప్ ఇప్పటికే ఇన్‌స్టాల్ అయి ఉండవచ్చు లేదా ఈ బ్రౌజర్‌లో నేరుగా ఇన్‌స్టాల్ సపోర్ట్ ఉండకపోవచ్చు. Chrome లేదా Safari లో ఓపెన్ చేసి ప్రయత్నించండి.',
    gotIt: 'సరే',
    subtitle: 'మీ హోమ్ స్క్రీన్ నుండి సులభంగా ఓపెన్ చేయండి',
  },
  hi: {
    installBtn: 'ऐप इंस्टॉल करें',
    installedBtn: 'ऐप इंस्टॉल है',
    installedGuideTitle: 'ऐप पहले से इंस्टॉल है',
    installedGuideDesc: 'प्रजा सेवा ऐप आपके डिवाइस पर पहले से इंस्टॉल है। आप इसे सीधे अपनी होम स्क्रीन या ऐप ड्रॉअर से खोल सकते हैं।',
    iosGuideTitle: 'iPhone / iPad पर इंस्टॉल करें',
    iosStep1: 'Safari के नीचे Share बटन पर टैप करें।',
    iosStep2: 'नीचे स्क्रॉल करें और "Add to Home Screen" पर टैप करें।',
    iosStep3: 'इंस्टॉल करने के लिए ऊपर दाईं ओर "Add" पर टैप करें।',
    browserGuideTitle: 'ऐप इंस्टॉल करें',
    browserGuideDesc: 'यदि इंस्टॉल पॉपअप नहीं आया है, तो ऐप पहले से इंस्टॉल हो सकता है या यह ब्राउज़र डायरेक्ट इंस्टॉल को सपोर्ट नहीं करता। कृपया Chrome या Safari में खोलें।',
    gotIt: 'समझ गया',
    subtitle: 'होम स्क्रीन से सीधे 1-टैप एक्सेस',
  },
  ta: {
    installBtn: 'செயலியை நிறுவுக',
    installedBtn: 'செயலி நிறுவப்பட்டது',
    installedGuideTitle: 'செயலி ஏற்கனவே நிறுவப்பட்டுள்ளது',
    installedGuideDesc: 'பிரஜா சேவா செயலி உங்கள் சாதனத்தில் ஏற்கனவே நிறுவப்பட்டுள்ளது. முகப்புத் திரையிலிருந்து நேரடியாகத் திறக்கலாம்.',
    iosGuideTitle: 'iPhone / iPad-இல் நிறுவவும்',
    iosStep1: 'Safari கீழே உள்ள Share பொத்தானைத் தட்டவும்.',
    iosStep2: 'கீழே சென்று "Add to Home Screen" என்பதைத் தட்டவும்.',
    iosStep3: 'மேல் வலதுபுறத்தில் உள்ள "Add" என்பதைத் தட்டவும்.',
    browserGuideTitle: 'செயலியை நிறுவுக',
    browserGuideDesc: 'நிறுவல் பாப்-அப் தோன்றவில்லை எனில், செயலி ஏற்கனவே நிறுவப்பட்டிருக்கலாம் அல்லது இந்த உலாவி நேரடி நிறுவலை ஆதரிக்காமல் இருக்கலாம். Chrome/Safari-இல் திறக்கவும்.',
    gotIt: 'சரி',
    subtitle: 'முகப்புத் திரையிலிருந்து நேரடி அணுகல்',
  },
  kn: {
    installBtn: 'ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ',
    installedBtn: 'ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿದೆ',
    installedGuideTitle: 'ಆ್ಯಪ್ ಈಗಾಗಲೇ ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿದೆ',
    installedGuideDesc: 'ಪ್ರಜಾ ಸೇವಾ ಆ್ಯಪ್ ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಈಗಾಗಲೇ ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿದೆ. ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ನಿಂದ ನೇರವಾಗಿ ತೆರೆಯಬಹುದು.',
    iosGuideTitle: 'iPhone / iPad ನಲ್ಲಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ',
    iosStep1: 'Safari ಕೆಳಭಾಗದಲ್ಲಿರುವ Share ಬಟನ್ ಟ್ಯಾಪ್ ಮಾಡಿ.',
    iosStep2: 'ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಿ "Add to Home Screen" ಟ್ಯಾಪ್ ಮಾಡಿ.',
    iosStep3: 'ಮೇಲಿನ ಬಲಭಾಗದಲ್ಲಿ "Add" ಟ್ಯಾಪ್ ಮಾಡಿ.',
    browserGuideTitle: 'ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ',
    browserGuideDesc: 'ಇನ್‌ಸ್ಟಾಲ್ ಪಾಪ್-ಅಪ್ ಕಾಣದಿದ್ದರೆ, ಆ್ಯಪ್ ಈಗಾಗಲೇ ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿರಬಹುದು ಅಥವಾ ಈ ಬ್ರೌಸರ್ ನೇರ ಇನ್‌ಸ್ಟಾಲ್ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. Chrome/Safari ನಲ್ಲಿ ತೆರೆಯಿರಿ.',
    gotIt: 'ಸರಿ',
    subtitle: 'ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ನಿಂದ ನೇರ ಪ್ರವೇಶ',
  },
  ml: {
    installBtn: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക',
    installedBtn: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്തു',
    installedGuideTitle: 'ആപ്പ് ഇതിനകം ഇൻസ്റ്റാൾ ചെയ്തിട്ടുണ്ട്',
    installedGuideDesc: 'പ്രജാ സേവ ആപ്പ് നിങ്ങളുടെ ഉപകരണത്തിൽ ഇതിനകം ഇൻസ്റ്റാൾ ചെയ്തിട്ടുണ്ട്. ഹോം സ്ക്രീനിൽ നിന്ന് നേരിട്ട് തുറക്കാം.',
    iosGuideTitle: 'iPhone / iPad-ൽ ഇൻസ്റ്റാൾ ചെയ്യുക',
    iosStep1: 'Safari-യുടെ താഴെയുള്ള Share ബട്ടൺ ടാപ്പ് ചെയ്യുക.',
    iosStep2: 'താഴേക്ക് സ്ക്രോൾ ചെയ്ത് "Add to Home Screen" ടാപ്പ് ചെയ്യുക.',
    iosStep3: 'മുകളിൽ വലതുവശത്ത് "Add" ടാപ്പ് ചെയ്യുക.',
    browserGuideTitle: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക',
    browserGuideDesc: 'ഇൻസ്റ്റാൾ പോപ്പ്-അപ്പ് വന്നില്ലെങ്കിൽ, ആപ്പ് ഇതിനകം ഇൻസ്റ്റാൾ ചെയ്തിരിക്കാം അല്ലെങ്കിൽ ഈ ബ്രൗസർ പിന്തുണയ്ക്കുന്നില്ലായിരിക്കാം. Chrome/Safari-യിൽ തുറക്കുക.',
    gotIt: 'ശരി',
    subtitle: 'ഹോം സ്ക്രീനിൽ നിന്ന് വേഗത്തിൽ തുറക്കാം',
  },
  bn: {
    installBtn: 'অ্যাপ ইনস্টল করুন',
    installedBtn: 'অ্যাপ ইনস্টল করা আছে',
    installedGuideTitle: 'অ্যাপটি ইতিমধ্যেই ইনস্টল করা আছে',
    installedGuideDesc: 'প্রজা সেবা অ্যাপটি আপনার ডিভাইসে ইতিমধ্যেই ইনস্টল করা আছে। আপনি হোম স্ক্রিন বা অ্যাপ ড্রয়ার থেকে সরাসরি খুলতে পারেন।',
    iosGuideTitle: 'iPhone / iPad-এ ইনস্টল করুন',
    iosStep1: 'Safari-এর নিচে Share বোতামে ট্যাপ করুন।',
    iosStep2: 'নিচে স্ক্রল করে "Add to Home Screen"-এ ট্যাপ করুন।',
    iosStep3: 'ইনস্টল করতে উপরে ডানদিকে "Add" ট্যাপ করুন।',
    browserGuideTitle: 'অ্যাপ ইনস্টল করুন',
    browserGuideDesc: 'ইনস্টল পপআপ না এলে অ্যাপটি ইতিমধ্যেই ইনস্টল করা থাকতে পারে অথবা বর্তমান ব্রাউজারটি সরাসরি ইনস্টল সমর্থন করে না। Chrome বা Safari-তে খুলুন।',
    gotIt: 'বুঝেছি',
    subtitle: 'হোম স্ক্রিন থেকে সরাসরি ১-ট্যাপ অ্যাক্সেস',
  },
  mr: {
    installBtn: 'ॲप इन्स्टॉल करा',
    installedBtn: 'ॲप इन्स्टॉल आहे',
    installedGuideTitle: 'ॲप आधीच इन्स्टॉल केलेले आहे',
    installedGuideDesc: 'प्रजा सेवा ॲप तुमच्या डिव्हाइसवर आधीच इन्स्टॉल केलेले आहे. तुम्ही ते थेट होम स्क्रीनवरून उघडू शकता.',
    iosGuideTitle: 'iPhone / iPad वर इन्स्टॉल करा',
    iosStep1: 'Safari च्या तळाशी असलेल्या Share बटणावर टॅप करा.',
    iosStep2: 'खाली स्क्रोल करा आणि "Add to Home Screen" वर टॅप करा.',
    iosStep3: 'इन्स्टॉल करण्यासाठी वर उजवीकडे "Add" वर टॅप करा.',
    browserGuideTitle: 'ॲप इन्स्टॉल करा',
    browserGuideDesc: 'इन्स्टॉल पॉपअप न आल्यास, ॲप आधीच इन्स्टॉल असू शकते किंवा हा ब्राउझर थेट इन्स्टॉलला सपोर्ट करत नाही. Chrome किंवा Safari मध्ये उघडा.',
    gotIt: 'ठीक आहे',
    subtitle: 'होम स्क्रीनवरून थेट १-टॅप प्रवेश',
  },
  gu: {
    installBtn: 'એપ ઇન્સ્ટોલ કરો',
    installedBtn: 'એપ ઇન્સ્ટોલ છે',
    installedGuideTitle: 'એપ પહેલેથી જ ઇન્સ્ટોલ છે',
    installedGuideDesc: 'પ્રજા સેવા એપ તમારા ઉપકરણ પર પહેલેથી જ ઇન્સ્ટોલ છે. તમે તેને સીધી હોમ સ્ક્રીન પરથી ખોલી શકો છો.',
    iosGuideTitle: 'iPhone / iPad પર ઇન્સ્ટોલ કરો',
    iosStep1: 'Safari ના તળિયે Share બટન પર ટેપ કરો.',
    iosStep2: 'નીચે સ્ક્રોલ કરીને "Add to Home Screen" પર ટેપ કરો.',
    iosStep3: 'ઇન્સ્ટોલ કરવા માટે ઉપર જમણી બાજુ "Add" પર ટેપ કરો.',
    browserGuideTitle: 'એપ ઇન્સ્ટોલ કરો',
    browserGuideDesc: 'જો ઇન્સ્ટોલ પોપઅપ ન આવે, તો એપ પહેલેથી ઇન્સ્ટોલ હોઈ શકે છે અથવા આ બ્રાઉઝર સીધા ઇન્સ્ટોલને સપોર્ટ કરતું નથી. Chrome અથવા Safari માં ખોલો.',
    gotIt: 'સમજાયું',
    subtitle: 'હોમ સ્ક્રીન પરથી સીધી ૧-ટેપ ઍક્સેસ',
  },
};

interface PwaInstallButtonProps {
  lang?: IndianLanguage;
  variant?: 'card' | 'compact';
  className?: string;
}

export default function PwaInstallButton({
  lang = 'en',
  variant = 'card',
  className = '',
}: PwaInstallButtonProps) {
  const copy = PWA_TRANSLATIONS[lang] || PWA_TRANSLATIONS.en;

  const [isInstalled, setIsInstalled] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [modalMode, setModalMode] = useState<'none' | 'installed' | 'ios' | 'fallback'>('none');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkInstallState = async () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      let markedInstalled = false;
      try {
        markedInstalled = localStorage.getItem('praja_seva_pwa_installed') === 'true';
      } catch {}

      let relatedInstalled = false;
      try {
        const nav = navigator as any;
        if (typeof nav.getInstalledRelatedApps === 'function') {
          const apps = await nav.getInstalledRelatedApps();
          if (Array.isArray(apps) && apps.length > 0) {
            relatedInstalled = true;
          }
        }
      } catch {}

      setIsInstalled(standalone || markedInstalled || relatedInstalled);
    };

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    if (window.__prajaSevaDeferredPrompt) {
      setHasPrompt(true);
    }

    checkInstallState();

    const onPromptReady = () => setHasPrompt(true);
    const onInstalled = () => {
      setIsInstalled(true);
      setHasPrompt(false);
    };

    window.addEventListener('prajaseva-pwa-prompt-ready', onPromptReady);
    window.addEventListener('prajaseva-pwa-installed', onInstalled);

    return () => {
      window.removeEventListener('prajaseva-pwa-prompt-ready', onPromptReady);
      window.removeEventListener('prajaseva-pwa-installed', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.__prajaSevaDeferredPrompt;

    // 1. Direct 1-tap native PWA install if browser prompt is available
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          window.__prajaSevaDeferredPrompt = null;
          setHasPrompt(false);
          setIsInstalled(true);
          try {
            localStorage.setItem('praja_seva_pwa_installed', 'true');
          } catch {}
        }
        return;
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
      }
    }

    // 2. If already installed on this device, guide the user
    if (isInstalled) {
      setModalMode('installed');
      return;
    }

    // 3. iOS Safari / iPadOS guide
    if (isIos) {
      setModalMode('ios');
      return;
    }

    // 4. Other browsers where native prompt wasn't fired (e.g. already installed or in-app browser)
    setModalMode('fallback');
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            isInstalled && !hasPrompt
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:opacity-95 active:scale-[0.98]'
          } ${className}`}
        >
          {isInstalled && !hasPrompt ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{copy.installedBtn}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" />
              <span>{copy.installBtn}</span>
            </>
          )}
        </button>
      ) : (
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs ${
            isInstalled && !hasPrompt
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-white border-slate-200'
          } ${className}`}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isInstalled && !hasPrompt
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isInstalled && !hasPrompt ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">
                {isInstalled && !hasPrompt ? copy.installedGuideTitle : 'Praja Seva App'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {isInstalled && !hasPrompt ? copy.installedGuideDesc : copy.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shrink-0 cursor-pointer active:scale-95 ${
              isInstalled && !hasPrompt
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:opacity-95'
            }`}
          >
            {isInstalled && !hasPrompt ? (
              <>
                <Info className="w-4 h-4" />
                <span>{copy.installedBtn}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{copy.installBtn}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Guidance Modal */}
      {modalMode !== 'none' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalMode('none')}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    modalMode === 'installed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {modalMode === 'installed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {modalMode === 'installed'
                    ? copy.installedGuideTitle
                    : modalMode === 'ios'
                    ? copy.iosGuideTitle
                    : copy.browserGuideTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMode === 'installed' && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {copy.installedGuideDesc}
              </p>
            )}

            {modalMode === 'ios' && (
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Share className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>1. {copy.iosStep1}</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <PlusSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>2. {copy.iosStep2}</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>3. {copy.iosStep3}</span>
                </li>
              </ol>
            )}

            {modalMode === 'fallback' && (
              <p className="text-xs text-slate-600 leading-relaxed">
                {copy.browserGuideDesc}
              </p>
            )}

            <button
              type="button"
              onClick={() => setModalMode('none')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              {copy.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
