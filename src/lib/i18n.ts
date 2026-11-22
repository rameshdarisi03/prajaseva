// ==============================================================================
// MULTI-LANGUAGE DICTIONARY (TELUGU, ENGLISH, HINDI)
// Ultra-clean, plain regional language without bureaucratic municipal jargon
// ==============================================================================

export const translations = {
  te: {
    appTitle: 'ప్రజా సేవ పోర్టల్',
    subtitle: 'మీ సమస్యను ఫోటో తీసి పంపండి — తక్షణ పరిష్కారం',
    tabRaise: '📝 ఫిర్యాదు చేయండి',
    tabTrack: '🔍 స్టేటస్ చూడండి',
    
    // Form fields
    step1Location: '📍 మీ ప్రాంతం (GPS స్వయంచాలకంగా గుర్తిస్తుంది)',
    gpsDetecting: 'మీ లొకేషన్ గుర్తిస్తున్నాం...',
    gpsSuccess: 'లొకేషన్ విజయవంతంగా గుర్తించబడింది',
    gpsFallback: 'లొకేషన్ ఆన్ చేయండి',
    
    step2Photo: '📸 సమస్య ఫోటో తీయండి',
    tapToPhoto: 'కెమెరా ఆన్ చేసి ఫోటో తీయండి',
    photoRetake: 'మళ్ళీ ఫోటో తీయండి',
    
    step3Category: '🏷️ సమస్య రకం ఎంచుకోండి',
    catDrainage: 'డ్రైనేజీ సమస్య',
    catRoads: 'రోడ్డు / గుంతలు',
    catWater: 'తాగునీటి సరఫరా',
    catLights: 'వీధి దీపాలు',
    catGarbage: 'చెత్త & పారిశుధ్యం',
    catOther: 'ఇతర సమస్య',
    
    step4Details: '🎙️ వివరాలు (మాట్లాడండి లేదా రాయండి)',
    holdToRecord: 'మైక్ నొక్కి మాట్లాడండి',
    recording: 'రికార్డింగ్ అవుతోంది...',
    playAudio: 'మీ వాయిస్ వినండి',
    deleteAudio: 'తొలగించండి',
    reRecord: 'మళ్ళీ మాట్లాడండి',
    descriptionPlaceholder: 'ఉదాహరణ: మెయిన్ రోడ్డు వద్ద మురుగు నీరు నిలిచిపోయింది...',
    
    step5Contact: '📱 మీ వివరాలు',
    nameLabel: 'మీ పేరు *',
    phoneLabel: 'వాట్సాప్ మొబైల్ నంబర్ *',
    emailLabel: 'ఈమెయిల్ (అవసరం లేదు)',
    
    btnProceed: 'ఫిర్యాదు సమర్పించండి ➔',
    submitting: 'సమర్పిస్తున్నాము...',
    
    // OTP Modal
    otpTitle: 'మొబైల్ వెరిఫికేషన్',
    otpSubtitle: 'మీ వాట్సాప్ నంబర్‌కు 6 అంకెల కోడ్ పంపించాము',
    btnVerify: 'ధృవీకరించండి',
    resendOtp: 'మళ్ళీ కోడ్ పంపండి',
    
    // Success Screen
    successTitle: 'ఫిర్యాదు నమోదు అయ్యింది! 🎉',
    refLabel: 'మీ రిఫరెన్స్ నంబర్:',
    successNote: 'మీ వార్డు వాలంటీర్‌కు ఈ సమాచారం అందింది. పని పూర్తి కాగానే వాట్సాప్‌లో ఫోటోతో సహా అప్‌డేట్ వస్తుంది.',
    btnWhatsAppTrack: 'వాట్సాప్‌లో వివరాలు పొందండి',
    btnNewComplaint: 'మరో ఫిర్యాదు చేయండి',
    
    // Tracking
    trackTitle: 'ఫిర్యాదు స్థితిని తనిఖీ చేయండి',
    trackInputPlaceholder: 'రిఫరెన్స్ నంబర్ లేదా మొబైల్ నంబర్ నమోదు చేయండి',
    btnSearch: 'వెతకండి',
    statusNew: 'స్వీకరించబడింది',
    statusProgress: 'పని పురోగతిలో ఉంది',
    statusVerification: 'పరిశీలనలో ఉంది',
    statusResolved: 'సమస్య పరిష్కరించబడింది ✅',
    viewBefore: 'మునుపటి ఫోటో',
    viewAfter: 'పరిష్కరించిన ఫోటో',
    sharePoster: 'వాట్సాప్ స్టేటస్‌లో షేర్ చేయండి',
  },
  
  en: {
    appTitle: 'Praja Seva Portal',
    subtitle: 'Snap a photo, report local issues — fast ground resolution',
    tabRaise: '📝 Raise Grievance',
    tabTrack: '🔍 Track Status',
    
    step1Location: '📍 Exact Location (Auto GPS Detected)',
    gpsDetecting: 'Detecting your GPS location...',
    gpsSuccess: 'Location detected with high accuracy',
    gpsFallback: 'Please enable GPS on phone',
    
    step2Photo: '📸 Capture Photo Evidence',
    tapToPhoto: 'Tap to Open Camera & Snap Photo',
    photoRetake: 'Retake Photo',
    
    step3Category: '🏷️ Select Category',
    catDrainage: 'Drainage Issue',
    catRoads: 'Roads & Potholes',
    catWater: 'Drinking Water',
    catLights: 'Streetlights',
    catGarbage: 'Garbage & Sanitation',
    catOther: 'Other Civic Issue',
    
    step4Details: '🎙️ Details (Speak or Type)',
    holdToRecord: 'Tap to Record Voice Note',
    recording: 'Recording voice...',
    playAudio: 'Listen to Voice Recording',
    deleteAudio: 'Delete',
    reRecord: 'Re-record Voice',
    descriptionPlaceholder: 'e.g. Drain overflow in front of market shop no. 4...',
    
    step5Contact: '📱 Contact Information',
    nameLabel: 'Your Full Name *',
    phoneLabel: 'WhatsApp Mobile Number *',
    emailLabel: 'Email ID (Optional)',
    
    btnProceed: 'Submit Grievance ➔',
    submitting: 'Submitting grievance...',
    
    otpTitle: 'Mobile Verification',
    otpSubtitle: 'We sent a 6-digit verification code to your WhatsApp',
    btnVerify: 'Verify & Confirm',
    resendOtp: 'Resend Code',
    
    successTitle: 'Grievance Registered! 🎉',
    refLabel: 'Your Reference Number:',
    successNote: 'Assigned to your local Ward Volunteer. You will receive real-time updates and the resolution photo on WhatsApp.',
    btnWhatsAppTrack: 'Get WhatsApp Updates',
    btnNewComplaint: 'File Another Grievance',
    
    trackTitle: 'Track Your Grievance Live',
    trackInputPlaceholder: 'Enter Reference Number (#CMP-1001) or Mobile Number',
    btnSearch: 'Search Status',
    statusNew: 'Received & Logged',
    statusProgress: 'Work In Progress',
    statusVerification: 'Under Quality Review',
    statusResolved: 'Issue Resolved ✅',
    viewBefore: 'Before Photo',
    viewAfter: 'After Resolution Photo',
    sharePoster: 'Share on WhatsApp',
  },
  
  hi: {
    appTitle: 'प्रजा सेवा पोर्टल',
    subtitle: 'फोटो खींचें और समस्या दर्ज करें — त्वरित समाधान',
    tabRaise: '📝 शिकायत दर्ज करें',
    tabTrack: '🔍 स्थिति देखें',
    
    step1Location: '📍 सटीक स्थान (GPS द्वारा स्वतः खोजा गया)',
    gpsDetecting: 'स्थान का पता लगा रहे हैं...',
    gpsSuccess: 'स्थान सफलतापूर्वक प्राप्त हुआ',
    gpsFallback: 'कृपया फोन का GPS चालू करें',
    
    step2Photo: '📸 समस्या की फोटो लें',
    tapToPhoto: 'कैमरा खोलें और फोटो खींचें',
    photoRetake: 'दोबारा फोटो लें',
    
    step3Category: '🏷️ समस्या की श्रेणी चुनें',
    catDrainage: 'नाली / जल निकासी',
    catRoads: 'सड़क एवं गड्ढे',
    catWater: 'पेयजल आपूर्ति',
    catLights: 'स्ट्रीट लाइट',
    catGarbage: 'कचरा एवं स्वच्छता',
    catOther: 'अन्य समस्या',
    
    step4Details: '🎙️ विवरण (बोलें या लिखें)',
    holdToRecord: 'बोलकर रिकॉर्ड करें',
    recording: 'रिकॉर्ड हो रहा है...',
    playAudio: 'अपनी आवाज सुनें',
    deleteAudio: 'हटाएं',
    reRecord: 'फिर से रिकॉर्ड करें',
    descriptionPlaceholder: 'उदा. मुख्य बाजार में नाली का पानी सड़क पर आ रहा है...',
    
    step5Contact: '📱 आपका संपर्क विवरण',
    nameLabel: 'आपका पूरा नाम *',
    phoneLabel: 'व्हाट्सएप मोबाइल नंबर *',
    emailLabel: 'ईमेल आईडी (वैकल्पिक)',
    
    btnProceed: 'शिकायत सबमिट करें ➔',
    submitting: 'सबमिट हो रहा है...',
    
    otpTitle: 'मोबाइल सत्यापन',
    otpSubtitle: 'हमने आपके व्हाट्सएप पर 6 अंकों का कोड भेजा है',
    btnVerify: 'सत्यापित करें',
    resendOtp: 'दोबारा कोड भेजें',
    
    successTitle: 'शिकायत सफलतापूर्वक दर्ज! 🎉',
    refLabel: 'आपका संदर्भ नंबर:',
    successNote: 'यह शिकायत आपके वार्ड वॉलिंटियर को सौंप दी गई है। कार्य पूर्ण होने पर व्हाट्सएप पर फोटो प्राप्त होगी।',
    btnWhatsAppTrack: 'व्हाट्सएप पर अपडेट पाएं',
    btnNewComplaint: 'दूसरी शिकायत दर्ज करें',
    
    trackTitle: 'शिकायत की स्थिति जांचें',
    trackInputPlaceholder: 'संदर्भ नंबर या मोबाइल नंबर दर्ज करें',
    btnSearch: 'खोजें',
    statusNew: 'दर्ज हो गई',
    statusProgress: 'कार्य प्रगति पर है',
    statusVerification: 'समीक्षाधीन',
    statusResolved: 'समस्या का समाधान हुआ ✅',
    viewBefore: 'पहले की फोटो',
    viewAfter: 'समाधान के बाद की फोटो',
    sharePoster: 'व्हाट्सएप पर शेयर करें',
  }
};
