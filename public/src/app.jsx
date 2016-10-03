var classNames = require('classnames');
var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var noty =require('noty');

var NovelCard=React.createClass({
  getInitialState: function() {
    return {
      image: ""
    };
  },
  componentDidMount: function() {
    this.serverRequest = $.get(this.props.source+"?title="+this.props.novel.page, function (result) {
      this.setState({
        image: result.cover ? result.cover : "none"
      });
    }.bind(this));
  },
  componentWillUnmount: function() {
    this.serverRequest.abort();
  },
  render:function(){
    return (
      <a href={"https://baka-tsuki.org/project/index.php?title="+this.props.novel.page}>
        <div className="col-md-4 pane">
          <div className="pane-img" id={this.props.novel.pageid}>
            {(() => {
              if(!this.state.image){
                return <i className="fa fa-circle-o-notch fa-spin"></i>
              }else if(this.state.image=="none"){
                return <p>Cover not found</p>
              }else{
                return <img src={this.state.image}></img>
              }
            })()}
          </div>
          {this.props.novel.title}
        </div>
      </a>
    )
  }
})

var CategoryBar = React.createClass({
  getInitialState: function() {
    return {
      categories: [],
      novels:[],
      loading:false,
      complete:false
    };
  },

  componentDidMount: function() {
    var n=noty({text: 'Loading Categories',type:'information',layout:'bottomRight',theme:'relax'});
    this.serverRequest = $.get(this.props.source+"/category?category=genre", function (result) {
      this.setState({
        categories: result.map((genre,index)=>([genre,false]))
      });
      n.close();
      noty({text: 'Categories successfully loaded!',type:'success',layout:'bottomRight',theme:'relax',timeout:2000});
    }.bind(this));
  },

  componentWillUnmount: function() {
    this.serverRequest.abort();
  },

  getNovels:function(){
    var _ = this.state.categories.filter(genre=>genre[1]).map(genre=>genre[0])
    if(_){
      var n=noty({text: 'Loading novels',type:'information',layout:'bottomRight',theme:'relax'});
      this.serverRequest = $.get(this.props.source+"/category?genres="+_.join("|"), function (result) {
        console.log(result);
        this.setState({
          novels: result.titles
        });
        n.close();
        noty({text: 'Novels successfully loaded!',type:'success',layout:'bottomRight',theme:'relax',timeout:2000});
      }.bind(this));
    }  
  },

  toggleActive:function(id){
    var _ = this.state.categories;
    _[id][1]=!_[id][1];
    this.setState({categories:_});
  },

  handleClick:function(id){
    this.toggleActive(id);
    this.getNovels();
  },

  render: function() {
    return (
      <div>
        <div>
          {(() => {
            var c=this.state.categories;
            if (c.length>1) {
              return c.map((genre,index)=>(
                <div className={classNames({
                    'btn': true,
                    'btn-danger': !genre[1],
                    'btn-success': genre[1],
                    'genrebutton':true
                  })} key={index} onClick={() => this.handleClick(index)}>
                    {genre[0]}
                </div>
                ))            
            }else{
              return <p>Loading</p>
            }
          })()}
        </div>
        <div>
          {(() => {
            return this.state.novels.map((novel,index)=>(
              <NovelCard source="/api" novel={novel} key={novel.pageid}/>
              ))
          })()}
        </div>
      </div>
    );
  }
});

ReactDOM.render(
  <CategoryBar source="/api" />,
  document.getElementById('container')
);
