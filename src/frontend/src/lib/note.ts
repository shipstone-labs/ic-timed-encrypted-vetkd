import type { EncryptedNote, PrincipalEntry } from "../lib/backend";
import type { CryptoService } from "./crypto";
import type { Principal } from "@dfinity/principal";

export interface PrincipalEntryModel {
  name?: string;
  when?: bigint;
}
export interface NoteModel {
  id: bigint;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: Array<string>;
  owner: string;
  users: Array<PrincipalEntryModel>;
}

type SerializableNoteModel = Pick<NoteModel, "content">;
type SerializableNoteMetadataModel = Pick<
  NoteModel,
  "title" | "createdAt" | "updatedAt" | "tags"
>;

export function noteFromContent(
  content: string,
  tags: string[],
  self_principal: Principal
): NoteModel {
  const title = extractTitle(content);
  const creationTime = Date.now();

  return {
    id: BigInt(0),
    title,
    content,
    createdAt: creationTime,
    updatedAt: creationTime,
    tags,
    owner: self_principal.toString(),
    users: [],
  };
}

export async function serialize(
  note: NoteModel,
  cryptoService: CryptoService
): Promise<EncryptedNote> {
  const data: SerializableNoteMetadataModel = {
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
  };
  const serializableNote: SerializableNoteModel = {
    content: note.content,
  };
  const encryptedNote = await cryptoService.encryptWithNoteKey(
    note.id,
    note.owner,
    JSON.stringify(serializableNote)
  );
  return {
    id: note.id,
    encrypted_text: encryptedNote,
    data: JSON.stringify(data),
    owner: note.owner,
    users: note.users.map(
      (user) =>
        ({
          name: user.name ? [user.name] : [],
          when: user.when ? [user.when] : [],
        } as PrincipalEntry)
    ),
  };
}

export async function deserialize(
  enote: EncryptedNote,
  cryptoService: CryptoService
): Promise<NoteModel> {
  const serializedNote = await cryptoService.decryptWithNoteKey(
    enote.id,
    enote.owner,
    enote.encrypted_text
  );
  const deserializedNote: SerializableNoteModel = JSON.parse(serializedNote);
  const data: SerializableNoteMetadataModel = JSON.parse(enote.data);
  return {
    id: enote.id,
    owner: enote.owner,
    users: enote.users.map((user) => ({
      name: user.name[0] || null,
      when: user.when[0] || null,
    })),
    ...deserializedNote,
    ...data,
  };
}

export function summarize(note: NoteModel, maxLength = 50) {
  const div = document.createElement("div");
  div.innerHTML = note.content;

  let text = div.innerText;
  const title = extractTitleFromDomEl(div);
  if (title) {
    text = text.replace(title, "");
  }

  return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
}

function extractTitleFromDomEl(el: HTMLElement) {
  const title = el.querySelector("h1");
  if (title) {
    return title.innerText;
  }

  const blockElements = el.querySelectorAll(
    "h1,h2,p,li"
  ) as NodeListOf<HTMLElement>;
  for (const el of blockElements) {
    if (el.innerText?.trim().length > 0) {
      return el.innerText.trim();
    }
  }
  return "";
}

export function extractTitle(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return extractTitleFromDomEl(div);
}
