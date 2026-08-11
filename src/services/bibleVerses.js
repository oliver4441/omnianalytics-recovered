const bibleVerses = [
  { verse: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
  { verse: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { verse: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { verse: "Isaiah 40:31", text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { verse: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness." },
  { verse: "Romans 8:28", text: "And we know that all things work together for good to those who love God, to those who are called according to his purpose." },
  { verse: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble." },
  { verse: "Matthew 11:28", text: "Come to me, all who labor and are heavy laden, and I will give you rest." },
  { verse: "John 14:27", text: "Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid." },
  { verse: "Romans 15:13", text: "May the God of hope fill you with all joy and peace in believing, so that by the power of the Holy Spirit you may abound in hope." },
  { verse: "Exodus 14:14", text: "The Lord will fight for you, and you have only to be silent." },
  { verse: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you." },
  { verse: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
  { verse: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you." },
  { verse: "Psalm 34:17", text: "When the righteous cry for help, the Lord hears and rescues them from all their troubles." },
  { verse: "Proverbs 1:33", text: "But whoever listens to me will dwell secure and will be at ease, without dread of disaster." },
  { verse: "Matthew 6:34", text: "Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble." },
  { verse: "2 Timothy 1:7", text: "For God gave us a spirit not of fear but of power and love and self-control." },
  { verse: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer." },
  { verse: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  { verse: "Ecclesiastes 9:10", text: "Whatever your hand finds to do, do it with your might, for there is no work or thought or knowledge or wisdom in Sheol, to which you are going." },
  { verse: "1 Corinthians 10:13", text: "No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability, but with the temptation he will also provide the way of escape, that you may be able to endure it." },
  { verse: "Galatians 6:9", text: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up." },
  { verse: "Psalm 37:4", text: "Delight yourself in the Lord, and he will give you the desires of your heart." },
  { verse: "Proverbs 16:3", text: "Commit to the Lord whatever you do, and he will establish your plans." },
  { verse: "Isaiah 41:10", text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand." },
  { verse: "Romans 5:3-4", text: "Not only that, but we also rejoice in our sufferings, because we know that suffering produces endurance, endurance produces character, and character produces hope." },
  { verse: "James 1:2-4", text: "Count it all joy, my brothers, when you meet trials of various kinds, for you know that the testing of your faith produces steadfastness. And let steadfastness have its full effect, that you may be perfect and complete, lacking in nothing." },
  { verse: "Psalm 121:1-2", text: "I lift up my eyes to the hills. From where does my help come? My help comes from the Lord, who made heaven and earth." },
  { verse: "Proverbs 2:6-8", text: "For the Lord gives wisdom; from his mouth come knowledge and understanding; he stores up sound wisdom for the upright; he is a shield to those who walk in integrity." },
  { verse: "Matthew 5:16", text: "In the same way, let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven." },
  { verse: "Colossians 3:17", text: "And whatever you do, in word or deed, do everything in the name of the Lord Jesus, giving thanks to God the Father through him." },
  { verse: "1 Thessalonians 5:16-18", text: "Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you." },
  { verse: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want." },
  { verse: "Psalm 23:4", text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
  { verse: "Isaiah 43:2", text: "When you pass through the waters, I will be with you; and through the rivers, they shall not overwhelm you; when you walk through fire you shall not be burned, and the flame shall not consume you." },
  { verse: "Romans 8:37-39", text: "No, in all these things we are more than conquerors through him who loved us. For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers, nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord." },
  { verse: "2 Corinthians 4:17-18", text: "For this light momentary affliction is preparing for us an eternal weight of glory beyond all comparison, as we look not to the things that are seen but to the things that are unseen. For the things that are seen are transient, but the things that are unseen are eternal." },
  { verse: "Ephesians 2:8-9", text: "For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast." },
  { verse: "Philippians 4:6-7", text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus." }
];

const ENCOURAGEMENT_INTERVAL = 10 * 60 * 1000;

let currentVerseIndex = Math.floor(Math.random() * bibleVerses.length);
let lastShownTime = 0;

export function getRandomVerse() {
  const now = Date.now();
  if (now - lastShownTime >= ENCOURAGEMENT_INTERVAL) {
    currentVerseIndex = (currentVerseIndex + 1) % bibleVerses.length;
    lastShownTime = now;
  }
  return bibleVerses[currentVerseIndex];
}

export function getAllVerses() {
  return bibleVerses;
}

export default bibleVerses;
