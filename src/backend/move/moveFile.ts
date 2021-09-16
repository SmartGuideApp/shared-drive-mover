/* exported moveFile */

async function moveFileDirectly(
  fileID: string,
  sourceID: string,
  destinationID: string
): Promise<void> {
  await backoffHelper(() =>
    Drive.Files!.update({}, fileID, null, {
      addParents: destinationID,
      removeParents: sourceID,
      supportsAllDrives: true,
      fields: "",
    })
  );
}

async function listFileComments(
  fileID: string
): Promise<Array<GoogleAppsScript.Drive.Schema.Comment>> {
  return await paginationHelper<
    GoogleAppsScript.Drive.Schema.CommentList,
    GoogleAppsScript.Drive.Schema.Comment
  >(
    (pageToken) =>
      Drive.Comments!.list(fileID, {
        maxResults: 100,
        pageToken: pageToken,
        fields:
          "nextPageToken, items(author(isAuthenticatedUser, displayName), content, status, context, anchor, replies(author(isAuthenticatedUser, displayName), content, verb))",
      }),
    (response) => response.items!
  );
}

async function copyFileComments(
  sourceID: string,
  destinationID: string
): Promise<void> {
  const comments = await listFileComments(sourceID);
  for (const comment of comments) {
    if (!comment.author!.isAuthenticatedUser) {
      comment.content =
        "*" + comment.author!.displayName! + ":*\n" + comment.content!;
    }
    const replies = comment.replies!;
    delete comment.replies;
    const commentId = Drive.Comments!.insert(comment, destinationID).commentId!;
    for (const reply of replies) {
      if (!reply.author!.isAuthenticatedUser) {
        reply.content =
          "*" + reply.author!.displayName! + ":*\n" + reply.content!;
      }
      Drive.Replies!.insert(reply, destinationID, commentId);
    }
  }
}

async function moveFileByCopy(
  fileID: string,
  name: string,
  destinationID: string,
  path: Array<string>,
  copyComments: boolean
): Promise<MoveError | null> {
  try {
    const copy = Drive.Files!.copy(
      {
        parents: [{ id: destinationID }],
        title: name,
      },
      fileID,
      { supportsAllDrives: true, fields: "id" }
    );
    if (copyComments) {
      await copyFileComments(fileID, copy.id!);
    }
    return null;
  } catch (e) {
    return {
      file: path.concat([name]),
      error: (e as GoogleJsonResponseException).message,
    };
  }
}

async function moveFile(
  file: GoogleAppsScript.Drive.Schema.File,
  sourceID: string,
  destinationID: string,
  path: Array<string>,
  copyComments: boolean
): Promise<MoveError | null> {
  let error = null;
  if (file.capabilities!.canMoveItemOutOfDrive!) {
    try {
      await moveFileDirectly(file.id!, sourceID, destinationID);
    } catch (_) {
      error = await moveFileByCopy(
        file.id!,
        file.title!,
        destinationID,
        path,
        copyComments
      );
    }
  } else {
    error = await moveFileByCopy(
      file.id!,
      file.title!,
      destinationID,
      path,
      copyComments
    );
  }
  return error;
}
