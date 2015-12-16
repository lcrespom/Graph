import { Node } from './graph';
import { NodeDef, NodeParamDef } from './synth';

//TODO refactor main so "n" can be typed to SynthNode
export function renderParams(n: any, ndef: NodeDef, panel: JQuery) {
	panel.empty();
	if (ndef.control)
		renderParamControl(n, panel);
	for (const param of Object.keys(ndef.params || {}))
		if (n.anode[param] instanceof AudioParam)
			renderAudioParam(n.anode, ndef, param, panel);
		else
			renderOtherParam(n.anode, ndef, param, panel);
}

function renderParamControl(n: any, panel: JQuery) {
	if (!n.controlParams) return;
	const combo = renderCombo(panel, n.controlParams, n.controlParam, 'Controlling');
	combo.on('input', _ => {
		if (n.controlParam)
			n.anode.disconnect(n.controlTarget[n.controlParam]);
		n.controlParam = combo.val();
		n.anode.connect(n.controlTarget[n.controlParam]);
	});
}

function renderAudioParam(anode: AudioNode, ndef: NodeDef, param: string, panel: JQuery) {
	const pdef: NodeParamDef = ndef.params[param];
	const aparam: AudioParam = anode[param];
	const sliderBox = $('<div class="slider-box">');
	const slider = $('<input type="range" orient="vertical">')
		.attr('min', 0)
		.attr('max', 1)
		.attr('step', 0.001)
		.attr('value', param2slider(aparam.value, pdef))
		.on('input', _ => {
			const value = slider2param(parseFloat(slider.val()), pdef);
			//TODO linear/log ramp at frame rate
			aparam.setValueAtTime(value, 0);
		});
	sliderBox.append(slider);
	slider.after('<br/>' + ucfirst(param));
	panel.append(sliderBox);
}

function renderOtherParam(anode: AudioNode, ndef: NodeDef, param: string, panel: JQuery) {
	const combo = renderCombo(panel, ndef.params[param].choices, anode[param], ucfirst(param));
	combo.on('input', _ => {
		anode[param] = combo.val();
	});
}

function renderCombo(panel: JQuery, choices: string[], selected: string, label: string): JQuery {
	const choiceBox = $('<div class="choice-box">');
	const combo = $('<select>').attr('size', choices.length);
	for (const choice of choices) {
		const option = $('<option>').text(choice);
		if (choice == selected) option.attr('selected', 'selected');
		combo.append(option);
	}
	choiceBox.append(combo);
	combo.after('<br/><br/>' + label);
	panel.append(choiceBox);
	return combo;
}

const LOG_BASE = 2;

function logarithm(base: number, x: number): number {
	return Math.log(x) / Math.log(base);
}

function param2slider(paramValue: number, pdef: NodeParamDef): number {
	if (pdef.linear) {
		return (paramValue - pdef.min) / (pdef.max - pdef.min);
	}
	else {
		if (paramValue - pdef.min == 0) return 0;
		const logRange = logarithm(LOG_BASE, pdef.max - pdef.min);
		return logarithm(LOG_BASE, paramValue - pdef.min) / logRange;
	}
}

function slider2param(sliderValue: number, pdef: NodeParamDef): number {
	if (pdef.linear) {
		return pdef.min + sliderValue * (pdef.max - pdef.min);
	}
	else {
		const logRange = logarithm(LOG_BASE, pdef.max - pdef.min);
		return pdef.min + Math.pow(LOG_BASE, sliderValue * logRange);
	}
}


//-------------------- Misc utilities --------------------

function ucfirst(str: string) {
	return str[0].toUpperCase() + str.substring(1);
}
