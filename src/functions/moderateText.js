// functions/moderateText.js
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.moderateText = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, ctx) => {
    const text = snap.data().content;
    const resp = await fetch(
      'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key='
      + functions.config().perspective.key,
      {
        method:'POST',
        body: JSON.stringify({
          comment: { text },
          requestedAttributes: { TOXICITY: {} }
        })
      }
    );
    const j = await resp.json();
    const score = j.attributeScores.TOXICITY.summaryScore.value;
    //  %80 üzeri toksikse pending yap
    await snap.ref.update({ status: score > 0.8 ? 'pending' : 'approved' });
  });
