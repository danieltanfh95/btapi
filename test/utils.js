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
  });
  describe("The capitalizeFirstLetter function", function(){
    it("makes the string have one captial letter in front. The rest is in lowercase.",function(){
      expect(utils.capitalizeFirstLetter("anything")).to.equal("Anything");
      expect(utils.capitalizeFirstLetter("Anything")).to.equal("Anything");
      expect(utils.capitalizeFirstLetter("AnythIng")).to.equal("Anything");
    })
  })
});