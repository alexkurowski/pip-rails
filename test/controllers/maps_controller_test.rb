require 'test_helper'

class MapsControllerTest < ActionDispatch::IntegrationTest
  test "#index" do
    get root_url
    assert_response :success
    assert_select "#gmap"
  end

end
