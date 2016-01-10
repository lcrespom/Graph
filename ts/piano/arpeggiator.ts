import { Timer } from '../synth/timer';

export class Arpeggiator {
	mode: string;
	octaves: number;
	_bpm: number;
	notes: NoteTable;
	notect: number;
	lastNote: NoteData;
	backward = false;
	timer: Timer;

	constructor(ac: AudioContext) {
		this.mode = '';
		this.octaves = 1;
		this.bpm = 60;
		this.notect = 0;
		this.notes = new NoteTable();
		this.timer = new Timer(ac, this.bpm);
		this.timer.start(time => this.timerCB(time));
	}

	get bpm() { return this._bpm }

	set bpm(v) {
		this._bpm = v;
		if (this.timer) this.timer.bpm = v;
	}

	timerCB(time: number): void {
		// Release previous note
		if (this.lastNote) {
			this.noteOff(this.lastNote.noteToPlay, this.lastNote.velocity, time);
			this.lastNote = null;
		}
		// Return if disabled or no notes
		if (this.mode.length == 0) return;
		const len = this.notes.length();
		if (len == 0) return;
		// Check note counter
		this.wrapCounter(len);
		// Get current note and play it
		const ndata = this.notes.get(this.notect);
		this.noteOn(ndata.noteToPlay, ndata.velocity, time);
		this.lastNote = ndata;
		// Update note counter
		if (this.mode == 'u')
			this.notect++;
		else if (this.mode == 'd')
			this.notect--;
		else if (this.mode == 'ud') {
			if (this.backward) this.notect--;
			else this.notect++;
		}
	}

	wrapCounter(len: number) {
		if (this.notect >= len) {
			if (this.mode != 'ud')
				this.notect = 0;
			else {
				this.backward = true;
				this.notect = len < 2 ? 0 : len - 2;
			}
		}
		else if (this.notect < 0) {
			if (this.mode != 'ud')
				this.notect = len - 1;
			else {
				this.backward = false;
				this.notect = len < 2 ? 0 : 1;
			}
		}
	}

	sendNoteOn(midi: number, velocity: number): void {
		if (this.mode.length == 0)
			return this.noteOn(midi, velocity);
		this.notes.add(midi, midi, velocity);
		if (this.octaves > 1)
			this.notes.add(midi, midi + 12, velocity);
		if (this.octaves > 2)
			this.notes.add(midi, midi + 24, velocity);
		if (this.notes.length() == 1)
			this.timer.start();
	}

	sendNoteOff(midi: number, velocity: number): void {
		if (this.mode.length == 0)
			this.noteOff(midi, velocity);
		this.notes.remove(midi);
		if (this.notes.length() == 0) {
			this.timerCB(0);
			this.timer.stop();
		}
	}

	// Event handlers
	noteOn(midi: number, velocity: number, time?: number): void {}
	noteOff(midi: number, velocity: number, time?: number): void {}
}


class NoteData {
	constructor(public note, public noteToPlay, public velocity) {}
}

class NoteTable {
	private notes: NoteData[] = [];

	length(): number { return this.notes.length; }

	get(i: number): NoteData { return this.notes[i]; }

	add(note: number, noteToPlay: number, velocity: number): void {
		const ndata = new NoteData(note, noteToPlay, velocity);
		for (let i = 0; i < this.notes.length; i++) {
			if (noteToPlay < this.notes[i].noteToPlay) {
				this.notes.splice(i, 0, ndata);
				return;
			}
		}
		this.notes.push(ndata);
	}

	remove(note: number): void {
		this.notes = this.notes.filter(ndata => ndata.note != note);
	}
}