import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { formatTimeSpan } from 'resource:///org/gnome/shell/misc/dateUtils.js';

import { ActiveState, Tag } from '../../common/constants.js';
import { enumParamSpec, flagsParamSpec, registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';

// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/messageList.js#L277
@registerClass()
class TimeLabel extends St.Label {
	private _datetime: GLib.DateTime;

	constructor() {
		super({
			style_class: 'event-time',
			x_expand: true,
			y_expand: true,
			x_align: Clutter.ActorAlign.START,
			y_align: Clutter.ActorAlign.END,
			min_width: 0,
		});

		this.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

		this._datetime = GLib.DateTime.new_now_utc();
	}

	get datetime() {
		return this._datetime;
	}

	set datetime(datetime) {
		if (this._datetime.equal(datetime)) return;

		this._datetime = datetime;

		if (this.mapped) this._updateText();
	}

	private _updateText() {
		this.text = formatTimeSpan(this._datetime);
	}

	override vfunc_map() {
		this._updateText();

		super.vfunc_map();
	}
}

export const HeaderControlsVisibility = {
	Visible: 0,
	VisibleOnHover: 1,
	Hidden: 2,
} as const;

export type HeaderControlsVisibility = (typeof HeaderControlsVisibility)[keyof typeof HeaderControlsVisibility];

@registerClass({
	Properties: {
		'pinned': GObject.ParamSpec.boolean('pinned', null, null, GObject.ParamFlags.READWRITE, false),
		'datetime': GObject.ParamSpec.boxed('datetime', null, null, GObject.ParamFlags.READWRITE, GLib.DateTime),
		'force-delete': GObject.ParamSpec.boolean('force-delete', null, null, GObject.ParamFlags.READWRITE, true),
		'protect-pinned': GObject.ParamSpec.boolean('protect-pinned', null, null, GObject.ParamFlags.READWRITE, true),
		'protect-tagged': GObject.ParamSpec.boolean('protect-tagged', null, null, GObject.ParamFlags.READWRITE, true),
		'header-visible': GObject.ParamSpec.boolean('header-visible', null, null, GObject.ParamFlags.READWRITE, true),
		'show-title': GObject.ParamSpec.boolean('show-title', null, null, GObject.ParamFlags.READWRITE, true),
		'controls-visibility': enumParamSpec(
			'controls-visibility',
			GObject.ParamFlags.READWRITE,
			HeaderControlsVisibility,
			HeaderControlsVisibility.Visible,
		),
		'tag': GObject.ParamSpec.string('tag', null, null, GObject.ParamFlags.READWRITE, ''),
		'active': flagsParamSpec('active', GObject.ParamFlags.READWRITE, ActiveState, ActiveState.None),
	},
	Signals: {
		'delete': {},
		'open-menu': {
			param_types: [GObject.TYPE_INT, GObject.TYPE_INT, GObject.TYPE_INT, GObject.TYPE_INT],
		},
	},
})
export class ClipboardItemHeader extends St.BoxLayout {
	private _forceDelete: boolean = false;
	private _protectPinned: boolean = true;
	private _protectTagged: boolean = true;
	private _headerVisible: boolean = true;
	private _controlsVisibility: HeaderControlsVisibility = HeaderControlsVisibility.Visible;
	private _tag: Tag | null = null;
	private _active: ActiveState = ActiveState.None;

	private readonly _headerIcon: St.Icon;
	private readonly _headerContent: St.BoxLayout;
	private readonly _headerTitle: St.Label;
	private readonly _timeLabel: TimeLabel;
	public buttons: St.BoxLayout;
	private readonly _deleteButton: St.Button;
	private readonly _menuButton: St.Button;
	private readonly _pinButton: St.Button;
	private readonly _tagIcon: St.Bin;

	constructor(ext: Extension, icon: Icon, title: string) {
		super({
			style_class: 'clipboard-item-header',
			y_align: Clutter.ActorAlign.START,
			x_expand: true,
			y_expand: false,
		});

		this._headerIcon = new St.Icon({
			style_class: 'clipboard-item-header-icon',
			gicon: loadIcon(ext, icon),
			y_align: Clutter.ActorAlign.CENTER,
		});
		this.add_child(this._headerIcon);

		this._headerContent = new St.BoxLayout({
			style_class: 'clipboard-item-header-content',
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
		});
		this.add_child(this._headerContent);

		this._headerTitle = new St.Label({
			style_class: 'clipboard-item-title',
			text: title,
			y_align: Clutter.ActorAlign.END,
		});
		this._headerTitle.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
		this._headerContent.add_child(this._headerTitle);

		this._timeLabel = new TimeLabel();
		this._headerContent.add_child(this._timeLabel);

		this.buttons = new St.BoxLayout({
			style_class: 'clipboard-item-header-buttons',
			x_align: Clutter.ActorAlign.END,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
		});
		this.add_child(this.buttons);

		this._menuButton = new St.Button({
			style_class: 'clipboard-item-header-button menu-button',
			y_align: Clutter.ActorAlign.CENTER,
			child: new St.Icon({ gicon: loadIcon(ext, Icon.ViewMore) }),
		});
		this._menuButton.connect('clicked', () => {
			const box = this._menuButton.get_transformed_extents();
			this.emit('open-menu', box.get_x(), box.get_y(), box.get_width(), box.get_height());
		});
		this.buttons.add_child(this._menuButton);

		this._deleteButton = new St.Button({
			style_class: 'clipboard-item-header-button',
			y_align: Clutter.ActorAlign.CENTER,
			child: new St.Icon({ gicon: loadIcon(ext, Icon.Delete) }),
		});
		this._deleteButton.connect('clicked', () => this.emit('delete'));
		this.buttons.add_child(this._deleteButton);

		this._pinButton = new St.Button({
			style_class: 'clipboard-item-header-button',
			y_align: Clutter.ActorAlign.CENTER,
			toggle_mode: true,
			child: new St.Icon({ gicon: loadIcon(ext, Icon.Pin) }),
		});
		this.buttons.add_child(this._pinButton);

		this._tagIcon = new St.Bin({
			style_class: 'clipboard-item-tag-button',
			y_align: Clutter.ActorAlign.CENTER,
			visible: false,
			child: new St.Icon({ gicon: loadIcon(ext, Icon.Tag) }),
		});
		this.buttons.add_child(this._tagIcon);

		// Bind properties
		this.bind_property('pinned', this._pinButton, 'checked', GObject.BindingFlags.BIDIRECTIONAL);
	}

	get pinned() {
		return this._pinButton.checked;
	}

	set pinned(pinned) {
		this._pinButton.checked = pinned;
		this.updateHeaderControls();
		this.notify('pinned');
	}

	get datetime() {
		return this._timeLabel.datetime;
	}

	set datetime(datetime) {
		this._timeLabel.datetime = datetime;
		this.notify('datetime');
	}

	get forceDelete() {
		return this._forceDelete;
	}

	set forceDelete(forceDelete) {
		this._forceDelete = forceDelete;
		this.updateHeaderControls();
		this.notify('force-delete');
	}

	get protectPinned() {
		return this._protectPinned;
	}

	set protectPinned(protectPinned) {
		this._protectPinned = protectPinned;
		this.updateHeaderControls();
		this.notify('protect-pinned');
	}

	get protectTagged() {
		return this._protectTagged;
	}

	set protectTagged(protectTagged) {
		this._protectTagged = protectTagged;
		this.updateHeaderControls();
		this.notify('protect-tagged');
	}

	get headerVisible() {
		return this._headerVisible;
	}

	set headerVisible(headerVisible) {
		if (this._headerVisible === headerVisible) return;

		this._headerVisible = headerVisible;
		this.notify('header-visible');

		this.y_expand = !headerVisible;
		this._headerIcon.opacity = headerVisible ? 255 : 0;
		this._headerContent.opacity = headerVisible ? 255 : 0;
	}

	get showTitle() {
		return this._headerTitle.visible;
	}

	set showTitle(showTitle) {
		this._headerTitle.visible = showTitle;
		this.notify('show-title');
	}

	get controlsVisibility() {
		return this._controlsVisibility;
	}

	set controlsVisibility(controlsVisibility) {
		this._controlsVisibility = controlsVisibility;
		this.updateHeaderControls();
		this.notify('controls-visibility');
	}

	get tag() {
		return this._tag;
	}

	set tag(tag) {
		if (this._tag === tag) return;

		this._tag = tag;
		this.notify('tag');

		this.style_class = 'clipboard-item-header' + (tag ? ` ${tag}` : '');
		this.updateHeaderControls();
	}

	get active() {
		return this._active;
	}

	set active(active) {
		this._active = active;
		this.updateHeaderControls();
		this.notify('active');
	}

	private updateHeaderControls() {
		let visible = true;
		if (this._controlsVisibility === HeaderControlsVisibility.VisibleOnHover) {
			visible = this.active !== ActiveState.None;
		} else if (this._controlsVisibility === HeaderControlsVisibility.Hidden) {
			visible = false;
		}

		let deleteVisible = true;
		if (((this._protectPinned && this.pinned) || (this._protectTagged && this.tag)) && !this._forceDelete) {
			deleteVisible = false;
		}

		this._pinButton.visible = visible || this.pinned;
		this._menuButton.visible = visible;
		this._deleteButton.visible = visible && deleteVisible;
		this._tagIcon.visible = this._tag !== null && !this._pinButton.visible;
	}
}
