/**
 * Fake content for the dev seed (2.11, X-10). Never goes to production.
 *
 * 20 posts in publication order: TOTW 1 is full (15/15) and TOTW 2 is at 5/15.
 * Post 1 is the "Fati" example from the ERD (§8). Some headwords come back in
 * later posts (crave, outline, reluctant) so the already-seen warning (F14) and
 * the search (F12) have something to find.
 */
export type SeedTerm = {
  /** Exactly as written in the post text. */
  surface: string;
  headword: string;
  fr: string[];
  definition: string;
  analogyTitle: string;
  analogyBody: string;
  emoji: string;
  /** Always an English question. */
  question: string;
  /** What the term means in this post. The quote is cut from the text. */
  inContext: string;
};

export type SeedPost = { text: string; terms: SeedTerm[] };

export const SEED_POSTS: SeedPost[] = [
  {
    text: 'Fati was "thrilled" by the conversation. She gave us an outline of the project, and the only downside is the deadline. Once you taste that kind of teamwork, we crave it more and more.',
    terms: [
      {
        surface: "thrilled",
        headword: "thrilled",
        fr: ["Ravi", "Enchanté", "Euphorique"],
        definition:
          "Extremely pleased and excited. Not just happy, but buzzing with a strong, sudden joy.",
        analogyTitle: "The surprise party analogy",
        analogyBody:
          "You open the door, the lights come on and everyone shouts your name. That jump of joy in your chest is being thrilled.",
        emoji: "🎉",
        question: "Were you thrilled when everyone jumped out and yelled surprise?",
        inContext: "Fati enjoyed the conversation a lot; it really excited her.",
      },
      {
        surface: "outline",
        headword: "outline",
        fr: ["Grandes lignes", "Esquisse", "Plan"],
        definition: "A short description of the main points of something, without the details.",
        analogyTitle: "The pencil sketch analogy",
        analogyBody:
          "Before painting, an artist draws a light pencil shape of the picture. You can see what it will be, but nothing is filled in yet.",
        emoji: "✏️",
        question: "Can you give me an outline of your plan before we start?",
        inContext: "Fati explained the main points of the project, not every detail.",
      },
      {
        surface: "downside",
        headword: "downside",
        fr: ["Inconvénient", "Revers", "Point négatif"],
        definition: "The negative part of a situation that is otherwise good.",
        analogyTitle: "The sunny beach analogy",
        analogyBody:
          "A perfect beach day, warm water, great music, and then you notice there is no shade at all. The sunburn is the downside.",
        emoji: "🏖️",
        question: "What is the biggest downside of working from home?",
        inContext: "The project is good; the deadline is the one negative point.",
      },
      {
        surface: "crave",
        headword: "crave",
        fr: ["Avoir soif de", "Désirer ardemment", "Avoir envie de"],
        definition: "To want something very strongly, almost as if you needed it.",
        analogyTitle: "The midnight snack analogy",
        analogyBody:
          "It is late, you are not hungry, but you keep thinking about that chocolate in the kitchen. You crave it.",
        emoji: "🍫",
        question: "What food do you crave when you are tired?",
        inContext: "After experiencing that teamwork, they want more of it, strongly.",
      },
    ],
  },
  {
    text: "The coach was adamant that nobody would skip training. A few players were reluctant at first, but he refused to budge.",
    terms: [
      {
        surface: "adamant",
        headword: "adamant",
        fr: ["Inflexible", "Catégorique", "Intransigeant"],
        definition: "Completely sure about something and refusing to change your mind.",
        analogyTitle: "The locked door analogy",
        analogyBody:
          "You push, you knock, you try another key: the door does not move. An adamant person is that door.",
        emoji: "🚪",
        question: "Why was your mother so adamant about coming home before ten?",
        inContext: "The coach firmly insisted, with no room for discussion.",
      },
      {
        surface: "reluctant",
        headword: "reluctant",
        fr: ["Réticent", "Hésitant", "Peu enclin"],
        definition: "Not willing to do something, so you do it slowly or without enthusiasm.",
        analogyTitle: "The cold pool analogy",
        analogyBody:
          "You stand at the edge of a cold pool, one toe in the water. You will get in, but not happily.",
        emoji: "🏊",
        question: "Were you reluctant to speak English in front of the class?",
        inContext: "Some players did not want to train at the beginning.",
      },
      {
        surface: "budge",
        headword: "budge",
        fr: ["Céder", "Bouger", "Fléchir"],
        definition: "To change your opinion or move even a little, usually after pressure.",
        analogyTitle: "The stuck sofa analogy",
        analogyBody:
          "Two people push a heavy sofa with all their strength and it does not move one centimetre. It will not budge.",
        emoji: "🛋️",
        question: "Did your boss budge when you asked for a raise?",
        inContext: "The coach did not change his decision at all.",
      },
    ],
  },
  {
    text: "We spent the whole afternoon haggling over the price of a rug. The seller tried to placate us with mint tea.",
    terms: [
      {
        surface: "haggling",
        headword: "haggle",
        fr: ["Marchander", "Négocier", "Discuter le prix"],
        definition: "To argue about a price, usually to make it lower.",
        analogyTitle: "The market stall analogy",
        analogyBody:
          "The seller says 50, you say 20, he says 40, you walk away, he calls you back at 30. That back-and-forth is haggling.",
        emoji: "🧺",
        question: "Do you enjoy haggling at markets, or do you pay the first price?",
        inContext: "They argued with the seller for hours to lower the price.",
      },
      {
        surface: "placate",
        headword: "placate",
        fr: ["Apaiser", "Calmer", "Amadouer"],
        definition: "To make someone less angry, often by giving them something.",
        analogyTitle: "The crying baby analogy",
        analogyBody:
          "A baby screams in the car, and you hand over a toy to calm it down for a few minutes. You placate it.",
        emoji: "🍼",
        question: "How do you placate a friend who is angry with you?",
        inContext: "The seller offered tea to calm the buyers down and keep them happy.",
      },
    ],
  },
  {
    text: "Her apology felt hollow. She kept dodging the real question and only offered vague promises.",
    terms: [
      {
        surface: "hollow",
        headword: "hollow",
        fr: ["Creux", "Vide de sens", "Sans sincérité"],
        definition: "Without real value or sincere feeling, even if it looks fine from outside.",
        analogyTitle: "The chocolate egg analogy",
        analogyBody:
          "A big shiny chocolate egg looks impressive, but you break it and there is only air inside.",
        emoji: "🥚",
        question: "Have you ever received an apology that felt hollow?",
        inContext: "Her apology did not sound sincere.",
      },
      {
        surface: "dodging",
        headword: "dodge",
        fr: ["Esquiver", "Éluder", "Éviter"],
        definition: "To avoid something, like a question or a duty, often in a clever way.",
        analogyTitle: "The dodgeball analogy",
        analogyBody:
          "The ball flies at you and you twist out of the way at the last second. Answering a question by talking about something else works the same way.",
        emoji: "🤸",
        question: "Why do politicians keep dodging simple questions?",
        inContext: "She avoided answering the important question.",
      },
    ],
  },
  {
    text: "The city is bustling on Saturday mornings. Street vendors cater to tourists, and the noise is relentless until noon.",
    terms: [
      {
        surface: "bustling",
        headword: "bustling",
        fr: ["Animé", "Grouillant", "Effervescent"],
        definition: "Full of people moving around and being busy.",
        analogyTitle: "The beehive analogy",
        analogyBody:
          "Bees fly in and out, every one of them busy, nobody standing still. A bustling street feels like that.",
        emoji: "🐝",
        question: "Do you prefer bustling cities or quiet villages?",
        inContext: "The city is very busy and full of life on Saturdays.",
      },
      {
        surface: "cater to",
        headword: "cater to",
        fr: ["Répondre aux besoins de", "S'adresser à", "Satisfaire"],
        definition: "To provide what a particular group of people wants or needs.",
        analogyTitle: "The kids' menu analogy",
        analogyBody:
          "A restaurant adds small portions, crayons and chicken nuggets because many families come. It caters to children.",
        emoji: "🍟",
        question: "Does your favourite café cater to people who work on laptops?",
        inContext: "The vendors sell things that tourists want.",
      },
      {
        surface: "relentless",
        headword: "relentless",
        fr: ["Incessant", "Implacable", "Sans relâche"],
        definition: "Continuing strongly without stopping or getting weaker.",
        analogyTitle: "The dripping tap analogy",
        analogyBody:
          "Drip, drip, drip, all night long, never slower, never pausing. That tap is relentless.",
        emoji: "🚰",
        question: "How do you deal with relentless pressure at work?",
        inContext: "The noise never stops all morning.",
      },
    ],
  },
  {
    text: "I was skeptical about the new phone, but the battery life is staggering. It lasts three days without a charge.",
    terms: [
      {
        surface: "skeptical",
        headword: "skeptical",
        fr: ["Sceptique", "Dubitatif", "Méfiant"],
        definition: "Having doubts that something is true or will work.",
        analogyTitle: "The magic trick analogy",
        analogyBody:
          "A man says he can read your mind. You fold your arms and wait to see the trick. That look on your face is skeptical.",
        emoji: "🤨",
        question: "Were you skeptical when you first heard about the app?",
        inContext: "The writer did not believe the new phone would be good.",
      },
      {
        surface: "staggering",
        headword: "staggering",
        fr: ["Stupéfiant", "Hallucinant", "Ahurissant"],
        definition: "So big or surprising that it is hard to believe.",
        analogyTitle: "The restaurant bill analogy",
        analogyBody:
          "You expect a bill of 30 euros and the waiter brings one for 300. You almost fall off your chair.",
        emoji: "😲",
        question: "What was the most staggering number you read this week?",
        inContext: "The battery lasts surprisingly long.",
      },
    ],
  },
  {
    text: "He tends to procrastinate, so his desk is a mess of overdue bills. Last week he finally decided to tackle the pile.",
    terms: [
      {
        surface: "procrastinate",
        headword: "procrastinate",
        fr: ["Procrastiner", "Remettre à plus tard", "Tergiverser"],
        definition: "To keep delaying something you should do, usually because it is unpleasant.",
        analogyTitle: "The laundry chair analogy",
        analogyBody:
          "The clothes go on the chair, tomorrow you will fold them, then tomorrow again. The pile grows and the chair disappears.",
        emoji: "🪑",
        question: "What do you usually procrastinate on?",
        inContext: "He keeps postponing his tasks, like paying bills.",
      },
      {
        surface: "overdue",
        headword: "overdue",
        fr: ["En retard", "Impayé", "Échu"],
        definition: "Not done, paid or returned by the time it was expected.",
        analogyTitle: "The library book analogy",
        analogyBody:
          "The book was due back on Monday. It is Friday and it is still on your shelf: it is overdue.",
        emoji: "📚",
        question: "Do you have any overdue tasks right now?",
        inContext: "The bills should already have been paid.",
      },
      {
        surface: "tackle",
        headword: "tackle",
        fr: ["S'attaquer à", "Affronter", "Prendre en main"],
        definition: "To start dealing with a difficult problem or job in a determined way.",
        analogyTitle: "The rugby analogy",
        analogyBody:
          "In rugby you run straight at the player and bring him down. Tackling a problem is running at it instead of away.",
        emoji: "🏉",
        question: "How do you tackle a big project when you don't know where to start?",
        inContext: "He finally started dealing with all those papers.",
      },
    ],
  },
  {
    text: "The new manager is very meticulous. She scrutinizes every report before it leaves the office.",
    terms: [
      {
        surface: "meticulous",
        headword: "meticulous",
        fr: ["Méticuleux", "Minutieux", "Pointilleux"],
        definition: "Paying great attention to every detail and doing things very carefully.",
        analogyTitle: "The watchmaker analogy",
        analogyBody:
          "A watchmaker places tiny gears with tweezers and a magnifying glass. Not one screw is left loose.",
        emoji: "⌚",
        question: "Are you meticulous when you pack for a trip?",
        inContext: "The manager is extremely careful with details.",
      },
      {
        surface: "scrutinizes",
        headword: "scrutinize",
        fr: ["Scruter", "Examiner minutieusement", "Passer au crible"],
        definition: "To look at or examine something very carefully to find problems.",
        analogyTitle: "The detective analogy",
        analogyBody:
          "A detective holds a magnifying glass over every fingerprint and every crumb on the table. Nothing escapes.",
        emoji: "🔍",
        question: "Do you scrutinize the small print before signing a contract?",
        inContext: "She checks each report very closely.",
      },
    ],
  },
  {
    text: "It was a daunting climb, but the view from the top was breathtaking. Our legs were sore for days afterwards.",
    terms: [
      {
        surface: "daunting",
        headword: "daunting",
        fr: ["Intimidant", "Décourageant", "Redoutable"],
        definition: "Looking difficult enough to make you feel worried or less confident.",
        analogyTitle: "The blank page analogy",
        analogyBody:
          "You must write a 30-page essay and the first page is still white. Just looking at it makes you tired.",
        emoji: "📄",
        question: "What was the most daunting exam you ever took?",
        inContext: "The climb looked hard and scary before they started.",
      },
      {
        surface: "breathtaking",
        headword: "breathtaking",
        fr: ["À couper le souffle", "Époustouflant", "Saisissant"],
        definition: "So beautiful or impressive that it surprises you.",
        analogyTitle: "The fireworks analogy",
        analogyBody:
          "The last firework explodes in gold across the whole sky and the crowd goes silent for a second.",
        emoji: "🎆",
        question: "Where did you see the most breathtaking sunset of your life?",
        inContext: "The view from the summit was extremely beautiful.",
      },
      {
        surface: "sore",
        headword: "sore",
        fr: ["Courbaturé", "Endolori", "Douloureux"],
        definition: "Painful, usually because a muscle was used too much or is injured.",
        analogyTitle: "The first gym day analogy",
        analogyBody:
          "The day after your first gym session, going down the stairs feels like a challenge. Every step hurts a bit.",
        emoji: "🦵",
        question: "Are your legs sore after a long walk?",
        inContext: "Their leg muscles hurt for several days.",
      },
    ],
  },
  {
    text: "The plan sounded feasible on paper. In practice, the budget was too tight and the team was swamped.",
    terms: [
      {
        surface: "feasible",
        headword: "feasible",
        fr: ["Faisable", "Réalisable", "Envisageable"],
        definition: "Possible to do in practice, with the time, money and skills available.",
        analogyTitle: "The road trip analogy",
        analogyBody:
          "Driving Paris to Lyon in one day: feasible. Driving Paris to Tokyo in one day: not feasible.",
        emoji: "🚗",
        question: "Is it feasible to learn a language in six months?",
        inContext: "The plan seemed possible to carry out when it was written down.",
      },
      {
        surface: "swamped",
        headword: "swamped",
        fr: ["Débordé", "Submergé", "Noyé sous le travail"],
        definition: "Having so much work that you can hardly handle it.",
        analogyTitle: "The leaking boat analogy",
        analogyBody:
          "Water comes in faster than you can throw it out with a bucket. Soon the boat is full: it is swamped.",
        emoji: "🛶",
        question: "Were you swamped with work before the holidays?",
        inContext: "The team had far too much work to do.",
      },
    ],
  },
  {
    text: "My grandmother is incredibly resilient. After the flood she rebuilt her garden and never once complained.",
    terms: [
      {
        surface: "resilient",
        headword: "resilient",
        fr: ["Résilient", "Endurant", "Qui se relève vite"],
        definition: "Able to recover quickly after something difficult or bad happens.",
        analogyTitle: "The rubber ball analogy",
        analogyBody:
          "Throw a rubber ball on the floor as hard as you want: it bounces straight back up, still round.",
        emoji: "🏀",
        question: "Who is the most resilient person you know?",
        inContext: "She recovered from a disaster with strength and calm.",
      },
    ],
  },
  {
    text: "The instructions were so convoluted that I gave up. A friend eventually showed me a straightforward way to do it.",
    terms: [
      {
        surface: "convoluted",
        headword: "convoluted",
        fr: ["Alambiqué", "Compliqué", "Tarabiscoté"],
        definition: "Too complicated and difficult to follow.",
        analogyTitle: "The tangled cables analogy",
        analogyBody:
          "Behind the TV, ten cables twist into one knot and you cannot tell which one goes where.",
        emoji: "🔌",
        question: "Why are tax forms always so convoluted?",
        inContext: "The instructions were far too complicated to understand.",
      },
      {
        surface: "straightforward",
        headword: "straightforward",
        fr: ["Simple", "Direct", "Sans détour"],
        definition: "Easy to understand or do, with no hidden difficulty.",
        analogyTitle: "The straight road analogy",
        analogyBody:
          "A road with no turns, no traffic lights, no crossings: you just drive and arrive.",
        emoji: "🛣️",
        question: "Is there a straightforward way to cook rice perfectly?",
        inContext: "The friend showed a simple method.",
      },
    ],
  },
  {
    text: "He made a candid admission during the interview: he had underestimated the competition. The journalists appreciated his frankness.",
    terms: [
      {
        surface: "candid",
        headword: "candid",
        fr: ["Franc", "Sincère", "Direct"],
        definition: "Honest and direct, even about things that are uncomfortable to say.",
        analogyTitle: "The honest mirror analogy",
        analogyBody:
          "A friend tells you there is spinach in your teeth before the meeting. Awkward, but candid and useful.",
        emoji: "🪞",
        question: "Can you be candid with your manager about your mistakes?",
        inContext: "He honestly admitted something unflattering.",
      },
      {
        surface: "underestimated",
        headword: "underestimate",
        fr: ["Sous-estimer", "Mésestimer", "Minimiser"],
        definition: "To think something is smaller, weaker or easier than it really is.",
        analogyTitle: "The small dog analogy",
        analogyBody:
          "You think the tiny dog is harmless, then it barks so loudly the whole street wakes up.",
        emoji: "🐕",
        question: "Have you ever underestimated how long a task would take?",
        inContext: "He thought the other teams were weaker than they were.",
      },
    ],
  },
  {
    text: "The weekend market used to be quaint, but now it is crammed with souvenir stalls.",
    terms: [
      {
        surface: "quaint",
        headword: "quaint",
        fr: ["Pittoresque", "Charmant", "Désuet"],
        definition: "Attractive in an old-fashioned, unusual way.",
        analogyTitle: "The postcard village analogy",
        analogyBody:
          "Tiny stone houses, flower boxes at every window, a bakery with a hand-painted sign. It looks like a postcard.",
        emoji: "🏘️",
        question: "Do you know a quaint little town worth visiting?",
        inContext: "The market used to be small and charming.",
      },
      {
        surface: "crammed",
        headword: "crammed",
        fr: ["Bondé", "Bourré", "Entassé"],
        definition: "So full that there is almost no space left.",
        analogyTitle: "The suitcase analogy",
        analogyBody:
          "You sit on your suitcase to close it because you pushed in one more pair of shoes.",
        emoji: "🧳",
        question: "Was the metro crammed with people this morning?",
        inContext: "The market is now overfilled with stalls.",
      },
    ],
  },
  {
    text: "I crave silence after a long day. Even a short walk helps me unwind before dinner.",
    terms: [
      {
        surface: "crave",
        headword: "crave",
        fr: ["Avoir besoin de", "Désirer ardemment", "Aspirer à"],
        definition: "To want something very strongly, almost as if you needed it.",
        analogyTitle: "The desert water analogy",
        analogyBody:
          "After hours in the hot desert, you think of nothing but a glass of cold water.",
        emoji: "🏜️",
        question: "Do you crave quiet time after a busy week?",
        inContext: "The writer strongly needs silence in the evening.",
      },
      {
        surface: "unwind",
        headword: "unwind",
        fr: ["Décompresser", "Se détendre", "Souffler"],
        definition: "To relax after work or stress.",
        analogyTitle: "The spring analogy",
        analogyBody:
          "A spring pressed down all day slowly stretches back to its normal shape when you let go.",
        emoji: "🌀",
        question: "How do you unwind after work?",
        inContext: "The walk helps the writer relax.",
      },
    ],
  },
  {
    text: "The startup's growth was meteoric. Investors were eager to join, even though profits were still elusive.",
    terms: [
      {
        surface: "meteoric",
        headword: "meteoric",
        fr: ["Fulgurant", "Éclair", "Très rapide"],
        definition: "Very fast and very successful, like a shooting star.",
        analogyTitle: "The shooting star analogy",
        analogyBody: "One second there is nothing, the next a bright line crosses the whole sky.",
        emoji: "☄️",
        question: "Which singer had the most meteoric rise you remember?",
        inContext: "The company grew extremely fast.",
      },
      {
        surface: "eager",
        headword: "eager",
        fr: ["Impatient", "Désireux", "Enthousiaste"],
        definition: "Wanting to do or have something very much, and soon.",
        analogyTitle: "The puppy analogy",
        analogyBody:
          "You pick up the leash and the puppy is already jumping at the door, tail spinning.",
        emoji: "🐶",
        question: "Were you eager to start your first job?",
        inContext: "Investors really wanted to put money in.",
      },
      {
        surface: "elusive",
        headword: "elusive",
        fr: ["Insaisissable", "Introuvable", "Fuyant"],
        definition: "Hard to find, reach or achieve.",
        analogyTitle: "The soap bar analogy",
        analogyBody:
          "You try to catch the soap in the bath and it slips out of your hand every time.",
        emoji: "🧼",
        question: "Is a good night's sleep elusive for you lately?",
        inContext: "The company had not managed to make a profit yet.",
      },
    ],
  },
  {
    text: "She was reluctant to share her outline, fearing the others would scoff at her ideas.",
    terms: [
      {
        surface: "reluctant",
        headword: "reluctant",
        fr: ["Réticente", "Hésitante", "Peu disposée"],
        definition: "Not willing to do something, so you do it slowly or without enthusiasm.",
        analogyTitle: "The dentist analogy",
        analogyBody:
          "You walk to the dentist very slowly, hoping the appointment gets cancelled on the way.",
        emoji: "🦷",
        question: "Are you reluctant to show your work before it is finished?",
        inContext: "She did not want to show her plan.",
      },
      {
        surface: "outline",
        headword: "outline",
        fr: ["Plan", "Ébauche", "Grandes lignes"],
        definition: "A short description of the main points of something, without the details.",
        analogyTitle: "The skeleton analogy",
        analogyBody: "A skeleton shows the shape of the body before muscles and skin are added.",
        emoji: "🦴",
        question: "Do you write an outline before you write an essay?",
        inContext: "Her rough plan of the ideas.",
      },
      {
        surface: "scoff",
        headword: "scoff",
        fr: ["Se moquer", "Railler", "Ricaner"],
        definition:
          "To laugh at or talk about something in a way that shows you think it is stupid.",
        analogyTitle: "The eye-roll analogy",
        analogyBody:
          "You share your dream and someone rolls their eyes and laughs through their nose. That is scoffing.",
        emoji: "🙄",
        question: "Did anyone scoff when you said you wanted to learn the piano?",
        inContext: "She was afraid the others would laugh at her ideas.",
      },
    ],
  },
  {
    text: "The movie was mediocre, though the soundtrack was mesmerizing.",
    terms: [
      {
        surface: "mediocre",
        headword: "mediocre",
        fr: ["Médiocre", "Moyen", "Quelconque"],
        definition: "Only average and not very good.",
        analogyTitle: "The lukewarm coffee analogy",
        analogyBody:
          "Not hot, not cold, not good, not terrible. You drink it, but you will not remember it.",
        emoji: "☕",
        question: "Why do some mediocre films become huge hits?",
        inContext: "The movie itself was just okay, nothing special.",
      },
      {
        surface: "mesmerizing",
        headword: "mesmerizing",
        fr: ["Envoûtant", "Hypnotique", "Fascinant"],
        definition: "So interesting or beautiful that you cannot stop watching or listening.",
        analogyTitle: "The campfire analogy",
        analogyBody:
          "You sit by a campfire and stare at the flames for an hour without noticing the time.",
        emoji: "🔥",
        question: "Which song do you find mesmerizing?",
        inContext: "The music held the writer's attention completely.",
      },
    ],
  },
  {
    text: "Our neighbour is a bit nosy. He lingers by the fence whenever we have guests.",
    terms: [
      {
        surface: "nosy",
        headword: "nosy",
        fr: ["Curieux", "Fouineur", "Indiscret"],
        definition: "Too interested in other people's private lives.",
        analogyTitle: "The open curtain analogy",
        analogyBody:
          "Every time a car stops in the street, the curtain across the road moves a little.",
        emoji: "👀",
        question: "Do you have a nosy relative who asks about your salary?",
        inContext: "The neighbour likes to know everyone's business.",
      },
      {
        surface: "lingers",
        headword: "linger",
        fr: ["S'attarder", "Traîner", "Rester"],
        definition: "To stay somewhere longer than needed, often slowly.",
        analogyTitle: "The last guest analogy",
        analogyBody:
          "The party is over, the music is off, and one guest still stands in the kitchen with a glass.",
        emoji: "🥂",
        question: "Do you linger at the table after dinner with friends?",
        inContext: "He stays near the fence to watch and listen.",
      },
    ],
  },
  {
    text: "Winning the final was bittersweet: it was also the captain's last game before retiring.",
    terms: [
      {
        surface: "bittersweet",
        headword: "bittersweet",
        fr: ["Doux-amer", "Mitigé", "Teinté de tristesse"],
        definition: "Happy and sad at the same time.",
        analogyTitle: "The graduation day analogy",
        analogyBody:
          "You celebrate your diploma with your friends, knowing you will all move to different cities next month.",
        emoji: "🎓",
        question: "What was the most bittersweet moment of your school years?",
        inContext: "The victory was joyful but also sad because the captain was leaving.",
      },
    ],
  },
];
