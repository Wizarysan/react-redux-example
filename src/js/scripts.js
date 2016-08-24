'use strict';

//Functions

function createDate() {
	var date = new Date();
	return date.toLocaleString();
}

function checkFields() {}

//Reducers

var RecordReducer = function RecordReducer(state, action) {
	//Редусер отвечает за каждую отдельную запись.
	switch (action.type) {
		case 'ADD_RECORD':
			return {
				id: action.id,
				title: action.title,
				text: action.text,
				date: action.date,
				isDeleted: false,
				isEditing: false
			};
		case 'CHANGE_RECORD':
			return {
				id: action.id,
				title: action.title,
				text: action.text,
				date: action.date,
				isEditing: false //После того как запись изменена надо изменить флаг редактирования
			};
		case 'DELETE_RECORD':
			if (state.id != action.id) {
				return state;
			}
			return Object.assign({}, state, { isDeleted: !state.isDeleted }); //Если id совпадают изменяется флаг удаления на противоположный
		case 'EDIT_RECORD':
			if (state.id != action.id) {
				return state;
			}
			return Object.assign({}, state, { isEditing: !state.isEditing }); //Если id совпадают изменяется флаг редактирования на противоположный
		default:
			return state;
	}
};

var RecordsReducer = function RecordsReducer() {
	var state = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
	var action = arguments[1];
	// Редусер отвечает за все записи, обращается к RecordReducer чтобы обработать отдельную
	switch (action.type) {
		case 'ADD_RECORD':
			var newrecords = [];
			return newrecords.concat(RecordReducer(undefined, action), //Тут меняется порядок чтобы новые записи были выше старых
			state);
		case 'CHANGE_RECORD':
			var newrecords = state.slice(); // дублируем записи в отдельный массив
			newrecords.reverse(); //разворачиваем, чтобы индекс соответствовал id редактируемой записи
			newrecords = newrecords.slice(0, action.id).concat( //обрезаем массив, добавляем измененную запись и остаток массива
			RecordReducer(undefined, action), newrecords.slice(action.id + 1));
			return newrecords.reverse(); // возвращаем развернутый обратно массив
		case 'DELETE_RECORD':
		case 'EDIT_RECORD':
			return state.map(function (r) {
				return RecordReducer(r, action);
			}); //вызывается одиночный редусер чтобы повесить флаг редактирования или удаления (для каждой записи)
		default:
			return state;
	}
};

var visibilityFilter = function visibilityFilter() {
	var state = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
	var action = arguments[1];
	//Редусер, отвечающий за фильтрацию записей 
	switch (action.type) {
		case 'SET_FILTER':
			return action.filter;
		default:
			return state;
	}
};

var _Redux = Redux;
var combineReducers = _Redux.combineReducers;
//App Reducer получает действие и данные из форм, и отправляет их в обьединение двух редусеров

var AppReducer = combineReducers({
	RecordsReducer: RecordsReducer,
	visibilityFilter: visibilityFilter
});

//React components

var nextRecordId = 0;

var Records = React.createClass({
	displayName: 'Records',
	//Общий компонент, выводящий записи, форму для их добавления и прочее. Пропами в них передаются записи
	render: function render() {
		return React.createElement(
			'div',
			{ className: 'records' },
			React.createElement(AddRecord, { records: this.props.records }),
			React.createElement(SearchField, null),
			React.createElement(ShowRecords, { records: this.props.records, filter: this.props.filter })
		);
	}
});

var AddRecord = React.createClass({
	displayName: 'AddRecord',
	//Компонент форма для добавления записи
	render: function render() {
		var _this = this;

		//ref - коллбэк, который в данном случае привязывает каждую ноду из которой мы будем брать значение к this чтобы потом удобно собрать данные
		//По клику диспатчится событие store, которое отправляет запись в redux. Он вызывает AppReducer.
		//Потом форма очищается
		return React.createElement(
			'div',
			{ className: 'addrecord' },
			React.createElement('input', { className: 'addrecord__title', placeholder: 'Title', ref: function ref(node) {
					_this.title = node;
				} }),
			React.createElement('textarea', { rows: '5', className: 'addrecord__text', placeholder: 'Comment text', ref: function ref(node) {
					_this.text = node;
				} }),
			React.createElement(
				'button',
				{ className: 'addrecord__submit-button', onClick: function onClick() {
						var formDate = createDate();
						store.dispatch({
							type: 'ADD_RECORD',
							id: nextRecordId++,
							title: _this.title.value,
							text: _this.text.value,
							date: formDate,
							isDeleted: false,
							isEditing: false
						});
						_this.title.value = '';
						_this.text.value = '';
					} },
				'Add Record'
			)
		);
	}
});

var ShowRecords = React.createClass({
	displayName: 'ShowRecords',
	//Компонент, выводящий все записи
	render: function render() {
		//Создаем пустой массив и заполняем его записями из пропса records, добавляя запись если у нее не стоит флаг isDeleted
		//Также проверяем содержится ли в тайтле или тексте фраза из поиска (this.props.filter) которая спустилась из редусера visibilityFilter
		var records = [];
		for (var i = 0, len = this.props.records.length; i < len; i++) {
			if (!this.props.records[i].isDeleted && (this.props.filter == '' || this.props.records[i].title.indexOf(this.props.filter) >= 0 || this.props.records[i].text.indexOf(this.props.filter) >= 0)) {
				records.push(this.props.records[i]);
			}
		}
		//Выводим из созданного ранее массива записи, в случае если у записи стоит флаг isEditing обращаемся к компоненту EditRecord,
		//чтобы отрендерить форму редактирования записи, иначе - к SingleRecord, просто рендерящему запись. (react if)
		//Передаем компонентам данные о записи через отдельные пропсы
		return React.createElement(
			'div',
			{ className: 'allrecords' },
			records.map(function (record) {
				if (record.isEditing) {
					return React.createElement(EditRecord, { key: record.id, id: record.id, title: record.title, text: record.text });
				} else {
					return React.createElement(SingleRecord, { key: record.id, id: record.id, title: record.title, date: record.date, text: record.text });
				}
			})
		);
	}
});

var SingleRecord = React.createClass({
	displayName: 'SingleRecord',
	//Компонент, отвечающий за каждую отдельную запись
	render: function render() {
		var _this2 = this;

		//Запись заполняется из пропсов и на две кнопки вешаются событя - одно из них диспатчит в стор изменение флага данной записи
		//на удаленную, а вторая - на редактируемую.
		return React.createElement(
			'div',
			{ className: 'record' },
			React.createElement(
				'h4',
				{ className: 'record__title' },
				this.props.title
			),
			React.createElement(
				'span',
				{ className: 'record__date' },
				this.props.date
			),
			React.createElement(
				'div',
				{ className: 'record__text' },
				this.props.text
			),
			React.createElement('button', { className: 'record__edit', onClick: function onClick() {
					store.dispatch({
						type: "EDIT_RECORD",
						id: _this2.props.id
					});
				} }),
			React.createElement('button', { className: 'record__delete', onClick: function onClick() {
					store.dispatch({
						type: "DELETE_RECORD",
						id: _this2.props.id
					});
				} })
		);
	}
});

var EditRecord = React.createClass({
	displayName: 'EditRecord',
	// Компонент форма редактирования записи
	//Так как в эту форму надо сразу подгрузить содержимое редактируемой записи то даем ей getInitialState, устанавливающий из пропов тайтл и текст
	// при рендере добавляем эти titleField и textField в поля формы. А при их изменении handleChange меняет это локальный стейт
	// так компонент становится контролируемым Реактом
	// кнопка посылает в общий store изменение записи
	getInitialState: function getInitialState() {
		return {
			titleField: this.props.title,
			textField: this.props.text
		};
	},
	handleChange: function handleChange() {
		this.setState({ titleField: this.title.value, textField: this.text.value });
	},
	render: function render() {
		var _this3 = this;

		return React.createElement(
			'div',
			{ className: 'record-editor' },
			React.createElement('input', { className: 'record-editor__title', value: this.state.titleField,
				onChange: this.handleChange, ref: function ref(node) {
					_this3.title = node;
				} }),
			React.createElement('textarea', { className: 'record-editor__text', rows: '5', value: this.state.textField,
				onChange: this.handleChange, ref: function ref(node) {
					_this3.text = node;
				} }),
			React.createElement(
				'button',
				{ className: 'record-editor__submit-button', onClick: function onClick() {
						store.dispatch({
							type: 'CHANGE_RECORD',
							id: _this3.props.id,
							title: _this3.title.value,
							text: _this3.text.value,
							date: createDate()
						});
						_this3.title.value = '';
						_this3.text.value = '';
					} },
				'Save Record'
			)
		);
	}
});

var SearchField = React.createClass({
	displayName: 'SearchField',
	getInitialState: function getInitialState() {
		return { searchString: '' };
	},
	handleChange: function handleChange(e) {
		// Если вы закомментируете данную строку, поле ввода не изменит свое значение.
		// Это потому, что в React'е, поле не может измениться независимо от свойства
		// которое было ему присвоено. В нашем случае, это this.state.searchString.

		this.setState({ searchString: e.target.value });
		store.dispatch({
			type: 'SET_FILTER',
			filter: e.target.value
		});
	},
	render: function render() {
		var searchString = this.state.searchString.trim().toLowerCase();
		return React.createElement(
			'div',
			{ className: 'search-field' },
			React.createElement('input', { type: 'text', className: 'search-field__input',
				value: this.state.searchString, onChange: this.handleChange, placeholder: 'Search...' })
		);
	}
});

var _Redux2 = Redux;
var createStore = _Redux2.createStore; //создаем стор в ЕС6 стиле, эквивалентно var createStore = Redux.createStore;

var store = createStore(AppReducer); //Назначаем Редусер, который будет обновлять стэйт
var render = function render() {
	ReactDOM.render(React.createElement(Records, { records: store.getState().RecordsReducer, filter: store.getState().visibilityFilter }), document.getElementById('app'));
};

store.subscribe(render); //ПОдписываем стор к рендеру, каждый раз при обновлении он будет делать рендер
render(); // Вызываем его первый раз чтобы отрендерить дефолтное значение

/* 
Создается стор в ЕС6 стиле, ему назначается основной редусер, который будет управлять всеми изменениями стэйта
Этот стор подписывается на функцию-рендер, в котором вызывается ReactDOM.render, который рендерит основной компонент Реакта
и сразу же передает в него пропой все записи, содержащиеся в стейте store.getState().RecordsReducer
Тут в дело вступает Реакт - в основном компоненте вызываются вложенные, в которые тоже передается тот проп
Один из них создает форму, в которых у полей реф на свою же ноду чтобы брать значения, по клику на кнопку
диспатчится эвент в стор.
Другой компонент выводит все записи, перебирая их массив.
Когда эвент диспатчится из первого компонента он собирает инфу из полей формы, дополняет id записи и датой и отправляет стору. 
Стор обращается к AppReducer, который назначен обновлять стейт
AppReducer состоит из некоторых других редусеров, обьединенных через combineReducers. Один из этих редусеров - RecordsReducer
В зависимости от action.type он делает что-то со стейтом.
RecordsReducer собирает массив из записей, вызывая RecordReducer чтобы обработать отдельную из них. Он так же ответственен и за перебор
этого массива при их изменении, а кажду отдельную так же обрабатывает RecordReducer
После их работы стейт обновляется и все рендерится заново - круг замыкается.

Добавление записи:   */

//рефакторнуть передачу пропов в отдельную запись в spread с новым бабелем