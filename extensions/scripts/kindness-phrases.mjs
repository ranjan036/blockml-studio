// Hand-written sentences that are added to the public comments when the kindness
// check is trained (scripts/train-kindness.mjs). The comments are adults arguing
// online; these teach two things they don't:
//  1. how children are unkind to each other (leaving someone out, put-downs), and
//  2. that saying who someone is (a religion, a colour, a disability…) is not unkind.
//     Models trained on online comments alone learn the opposite, because such words
//     often appear in attacks: a well-known unfairness of moderation AI.
// CHECK holds different sentences that are never trained on: they measure whether
// the lesson was learned, and the script prints how each one scores.

const fill = (templates, words) => templates.flatMap((t) => words.map((w) => t.replace('{}', w)));

// ---- 1. classroom language -----------------------------------------------------------

const INSULTS = ['stupid', 'dumb', 'ugly', 'an idiot', 'a loser', 'useless', 'annoying', 'boring', 'weird', 'a baby', 'a crybaby',
  'lazy', 'disgusting', 'the worst', 'pathetic', 'worthless', 'a failure', 'a fool', 'smelly', 'gross', 'fat', 'a cheater', 'so slow', 'a liar', 'creepy'];
const UNKIND = [
  ...fill(['You are {}.', "You're {}!", 'you are so {}', 'Everyone knows you are {}.'], INSULTS),
  'Nobody likes you.', 'No one likes you.', 'Nobody wants to be your friend.', "You can't play with us.", "We don't want you here.",
  'You are not my friend anymore.', 'Go away, nobody wants you.', 'You have no friends.', 'Everyone hates you.', "I don't like you.",
  'I hate you.', 'I hate you so much.', "You can't sit with us.", "Leave, we don't want you.", "Don't talk to me ever again.",
  'You are not invited.', 'Get lost.', 'Nobody cares about you.', 'Nobody asked you.', 'Shut up.', 'Shut up, nobody asked you.',
  'Your drawing is ugly.', 'Your idea is stupid.', 'You always lose.', 'You will never win.', 'You are bad at everything.',
  'You smell.', 'Your voice is annoying.', 'You look weird.', "You can't do anything right.", 'I wish you were not here.',
  'You ruin everything.', 'You ruined the game.', 'Your project is the worst.', 'You sing badly, stop it.', 'What an ugly dress.',
  'I will hit you.', 'I will beat you up.', 'I am going to hurt you.', 'I will break your toys.', 'We will never let you play.',
  'You are not good enough for our team.', 'Nobody picked you because you are slow.', 'Your lunch looks disgusting.',
  'You talk too much, be quiet.', 'Stop following us, go away.', 'We are not friends with you.', 'I never want to see you again.',
  'You should not have come.', 'Everyone laughs at you.', 'We all laughed at your drawing.', 'You are too small to play with us.',
  'No one wants you in our group.', 'You are not welcome here.', 'Your house is ugly and so are you.', 'You can never be my friend.',
];

const PRAISE = ['clever', 'kind', 'funny', 'a good friend', 'brave', 'helpful', 'amazing', 'the best', 'so fast', 'a star', 'very smart',
  'great at drawing', 'a good singer', 'strong', 'friendly', 'so cool', 'hard-working', 'a great player'];
const KIND = [
  ...fill(['You are {}.', "You're {}!", 'you are so {}', 'Everyone knows you are {}.'], PRAISE),
  'I like you.', 'Everybody likes you.', 'Do you want to play with us?', 'You can play with us.', 'We want you here.',
  'You are my friend.', 'Come and sit with us.', 'You are invited to my party.', 'I care about you.', 'Thanks for asking.',
  'Your drawing is beautiful.', 'Your idea is great.', 'You always try hard.', 'You will win next time.', 'You are good at this.',
  'I am glad you are here.', 'You made the game fun.', 'Your project is the best.', 'You sing well.', 'What a lovely dress.',
  'I will help you.', 'I will share my toys.', 'We will let you play.', 'You are good enough for our team.', 'I picked you for my team.',
  'Your lunch looks tasty.', 'Tell me more, I like your stories.', 'Come with us.', 'We are friends with you.', 'See you again tomorrow.',
  'I am happy you came.', 'Everyone laughed at the joke.', 'We all liked your drawing.', 'You are welcome here.', 'You can always be my friend.',
  // Ordinary sentences with words that also appear in unkind ones.
  "I don't like broccoli.", 'I hate homework.', 'I hate rainy days.', 'Nobody was hurt.', 'Nobody is at home.', 'No one knows the answer.',
  'I lost the game.', 'This game is hard.', 'I am bad at maths.', 'The test was the worst.', 'This puzzle is annoying.', 'The film was boring.',
  'Go away, rain.', 'Get the ball.', 'The bin is smelly.', 'The soup was disgusting.', 'The old bridge is ugly.', 'My bag is useless in the rain.',
  'Be quiet in the library.', 'The snail is so slow.', 'The baby is sleeping.', 'I never win at chess.', 'Shut the door, please.',
  'What time is it?', 'Can I have some water?', 'Let us go to the park.', 'My favourite colour is blue.', 'We have maths today.',
  'Hello, how are you?', 'Good morning.', 'Please pass the ball.', 'I am sorry.', 'Thank you very much.', 'See you at school.',
  'I am hungry.', 'It is raining today.', 'Where is my book?', 'I like playing football.', 'My dog is funny.', 'That was a hard level.',
];

// ---- 2. who someone is ---------------------------------------------------------------

const IDENTITIES = ['Muslim', 'Hindu', 'Christian', 'Sikh', 'Jewish', 'Buddhist', 'Jain', 'Parsi', 'religious', 'not religious',
  'black', 'white', 'brown', 'Asian', 'Indian', 'African', 'Chinese', 'Pakistani', 'American', 'Mexican', 'Arab', 'Bengali', 'Tamil',
  'Punjabi', 'Nepali', 'Bangladeshi', 'Japanese', 'British', 'a foreigner', 'an immigrant', 'a refugee',
  'a girl', 'a boy', 'a woman', 'a man', 'female', 'male', 'gay', 'lesbian', 'bisexual', 'transgender', 'straight',
  'blind', 'deaf', 'disabled', 'autistic', 'in a wheelchair', 'dyslexic', 'old', 'young', 'poor', 'dark-skinned', 'fair-skinned'];
const GROUPS = ['Muslims', 'Hindus', 'Christians', 'Sikhs', 'Jews', 'Buddhists', 'black people', 'white people', 'brown people',
  'Asian people', 'Indians', 'Africans', 'Chinese people', 'Pakistanis', 'Americans', 'Mexicans', 'Arabs', 'immigrants', 'refugees',
  'girls', 'boys', 'women', 'men', 'gay people', 'lesbians', 'transgender people', 'blind people', 'deaf people', 'disabled people',
  'autistic people', 'old people', 'poor people', 'foreigners'];

// (The words on their own too: a single word has nothing else in the sentence to balance it.)
const ABOUT_SOMEONE = ['{}', 'I am {}.', 'My friend is {}.', 'She is {}.', 'He is {}.', 'My teacher is {}.', 'My mother is {}.', 'We are {}.',
  'My best friend is {} and very kind.', 'I am proud to be {}.', 'Are you {}?', 'My neighbour is {}.', 'The new student is {}.',
  'My uncle is {}.', 'Some of my classmates are {}.'];
const ABOUT_A_GROUP = ['{}', '{} are my friends.', 'I like {}.', 'There are many {} in my city.', 'Some {} live on my street.', '{} are welcome here.',
  'We learned about {} at school.', 'My friends are {}.'];
const AGAINST_A_GROUP = ['I hate {}.', '{} are stupid.', 'All {} are disgusting.', '{} are idiots.', 'Nobody likes {}.', '{} should go away.',
  '{} are ugly and dumb.', "We don't want {} here."];

// Used for a last check that none of these words is flagged on its own.
export const WHO = [...IDENTITIES, ...GROUPS];

export const TRAIN = {
  unkind: [...UNKIND, ...fill(AGAINST_A_GROUP, GROUPS)],
  fine: [...KIND, ...fill(ABOUT_SOMEONE, IDENTITIES), ...fill(ABOUT_A_GROUP, GROUPS)],
};

// ---- never trained on: how well did it learn? ------------------------------------------

const CHECK_IDENTITIES = ['a Muslim', 'a Hindu', 'a Christian', 'a Sikh', 'Jewish', 'black', 'brown', 'Indian', 'Chinese', 'an immigrant',
  'a girl', 'gay', 'lesbian', 'transgender', 'blind', 'deaf', 'disabled', 'autistic', 'old', 'poor'];
const CHECK_GROUPS = ['Muslims', 'Hindus', 'Christians', 'Jews', 'black people', 'Indians', 'immigrants', 'girls', 'gay people', 'disabled people', 'old people'];

export const CHECK = {
  unkind: [
    'You are an idiot!', 'Nobody wants to play with you.', 'You smell bad.', "You're such a loser.", 'Your painting is rubbish.',
    'No one wants you on our team.', 'You are so dumb, nobody likes you.', 'Stop talking, you are annoying.', "You can't come to my party.",
    'You are the worst player ever.', 'Everyone thinks you are weird.', 'I will punch you.', 'You are useless at football.',
    'Get out of here, loser.', 'I hate you, go away.', 'You are a stupid baby.', 'Nobody will ever be your friend.', 'Your singing is horrible, be quiet.',
    ...fill(['I really hate {}.', '{} are dumb and ugly.', 'Go away, we do not like {}.'], CHECK_GROUPS),
  ],
  fine: [
    'Thank you for helping me!', 'Well done on your project.', 'I hate Mondays.', 'You are my best friend.', 'I love your drawing!',
    'Can I borrow your pencil?', 'You played really well today.', 'hello', 'I hate it when you are sad.', 'Do you want to join our team?',
    'Nobody finished the homework.', 'I am bad at drawing.', 'That level is so hard.', 'Your idea is brilliant.', 'I lost my pencil.',
    'The villain in the film is ugly.', 'Please come to my party.', 'You are the best player ever.', 'What is for lunch?', 'My dad is from Pakistan.',
    ...fill(['My cousin is {}.', 'My grandmother is {}.', 'Our new neighbour is {} and she is nice.'], CHECK_IDENTITIES),
    ...fill(['I have friends who are {}.', 'Many {} go to my school.'], CHECK_GROUPS),
  ],
};
