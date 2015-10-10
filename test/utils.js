var expect    = require("chai").expect;
var converter = require("../routes/utils");

describe("In the utils module", function() {
  describe("The mergeObjects function", function() {
    it("merges two objects if and only if both has the same keys", function() {
      var testObj1={"a":1,"b":2};
      var testObj2={"a":1};
      var testObj3={"c":2};

      expect(utils.mergeObjects(testObj2,testObj1)).to.deep.equal({"a":1});
      expect(utils.mergeObjects(testObj3,testObj1)).to.deep.equal({});
      expect(utils.mergeObjects(testObj3,testObj2)).to.deep.equal({});
    });
    it("merges two objects if and only if both has the same keys even if the order is reversed", function() {
      var testObj1={"a":1,"b":2};
      var testObj2={"a":1};
      var testObj3={"c":2};

      expect(utils.mergeObjects(testObj1,testObj2)).to.deep.equal({"a":1});
      expect(utils.mergeObjects(testObj1,testObj3)).to.deep.equal({});
      expect(utils.mergeObjects(testObj2,testObj3)).to.deep.equal({});
    });
    it("also merges them if one of them is empty", function() {
      var testObj1={};
      var testObj2={"a":1,"b":2};

      expect(utils.mergeObjects(testObj1,testObj2)).to.deep.equal(testObj2);
      expect(utils.mergeObjects(testObj2,testObj1)).to.deep.equal(testObj2);
    });
    it("throws TypeError for null",function(){
      try{
        utils.mergeObjects(null,{"a":1});
      }catch(err){
        expect(err).to.eql(new TypeError("Cannot read property 'length' of null"));
      }  
    })
  });
  describe("The capitalizeFirstLetter function", function(){
    it("makes the string have one captial letter in front. The rest is in lowercase.",function(){
      expect(utils.capitalizeFirstLetter("anything")).to.equal("Anything");
      expect(utils.capitalizeFirstLetter("Anything")).to.equal("Anything");
      expect(utils.capitalizeFirstLetter("AnythIng")).to.equal("Anything");
    })
    it("throws TypeError for null",function(){
      try{
        utils.capitalizeFirstLetter(null);
      }catch(err){
        expect(err).to.eql(new TypeError("Cannot read property 'toLowerCase' of null"));
      }  
    })
  })
  describe("The last function", function(){
    it("gives the last element of an array.",function(){
      expect(utils.last([1,2,3])).to.equal(3);
    })
    it("gives the last character of a string.",function(){
      expect(utils.last("hello")).to.equal("o");      
    })
    it("returns undefined for an object or number",function(){      
      expect(utils.last({"a":1,"b":2})).to.equal(undefined);
      expect(utils.last(1)).to.equal(undefined);
    })
    it("throws TypeError for null",function(){    
      try{
        utils.last(null);
      }catch(err){
        expect(err).to.eql(new TypeError("Cannot read property 'length' of null"));
      }  
    })
  })
  describe("The rest function", function(){
    it("gives all the elements of an array in an array except the first one",function(){
      expect(utils.rest([1,2,3])).to.deep.equal([2,3]);
      expect(utils.rest([1,"hey",3])).to.deep.equal(["hey",3]);
      expect(utils.rest([1,"h哈咯ey",3])).to.deep.equal(["h哈咯ey",3]);
    })
    it("gives all the characters of a string as an substring except the first one",function(){
      expect(utils.rest("abc")).to.deep.equal("bc");
      //it should also work for unicode characters
      expect(utils.rest("a/c")).to.deep.equal("/c");
      expect(utils.rest("a/c私")).to.deep.equal("/c私");
    })
    it("throws TypeError for objects",function(){
      try{
        utils.rest({"a":1});
      }catch(err){
        expect(err).to.eql(new TypeError("arr.slice is not a function"));
      }  
    })
    it("throws TypeError for null",function(){
      try{
        utils.rest(null);
      }catch(err){
        expect(err).to.eql(new TypeError("arr.slice is not a function"));
      }  
    })
  })
});