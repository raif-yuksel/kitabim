// functions/audit.js
exports.logModeration = functions.firestore
  .document('posts/{postId}')
  .onUpdate((change, ctx) => {
    const before = change.before.data();
    const after  = change.after.data();
    if (before.status !== after.status) {
      return admin.firestore().collection('auditLogs').add({
        action: 'status_change',
        postId: ctx.params.postId,
        from: before.status,
        to: after.status,
        by: ctx.auth?.uid || 'system',
        at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
