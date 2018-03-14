require 'test_helper'

class PotholesControllerTest < ActionDispatch::IntegrationTest
  test "#create" do
    count_before = Pothole.count

    post potholes_url,
      params: {
        pothole: {
          latitude: -28.5,
          longitude: 153.5
        }
      }
    assert_response :success

    assert_equal count_before + 1, Pothole.count
  end

  test "#in_bounds" do
    bounds   = generate_bounds
    inside1  = Pothole.create generate_point_inside_bounds bounds
    inside2  = Pothole.create generate_point_inside_bounds bounds
    outside1 = Pothole.create generate_point_outside_bounds bounds
    outside2 = Pothole.create generate_point_outside_bounds bounds

    post potholes_in_bounds_url,
      params: bounds
    assert_response :success

    potholes = JSON.parse response.body
    pothole_ids = potholes.map { |pothole| pothole['id'] }

    assert pothole_ids.include? inside1.id
    assert pothole_ids.include? inside2.id
    assert_not pothole_ids.include? outside1.id
    assert_not pothole_ids.include? outside2.id
  end

  test "#update" do
    bounds  = generate_bounds
    unfixed = Pothole.create generate_point_inside_bounds bounds
    fixed   = Pothole.create generate_point_inside_bounds bounds

    assert fixed.fixed_at.nil?

    put potholes_url,
      params: {
        pothole: {
          id: fixed.id,
          fixed_at: Time.now
        }
      }
    assert_response :success

    assert_not fixed.reload.fixed_at.nil?

    post potholes_in_bounds_url,
      params: bounds
    assert_response :success

    potholes = JSON.parse response.body
    pothole_ids = potholes.map { |pothole| pothole['id'] }

    assert pothole_ids.include? unfixed.id
    assert_not pothole_ids.include? fixed.id
  end

  private

    BOUNDS_SIZE = 0.1

    def generate_bounds
      south = rand * 90
      west  = rand * 180
      north = south + BOUNDS_SIZE
      east  = west  + BOUNDS_SIZE

      {
        south: south,
        west:  west,
        north: north,
        east:  east
      }
    end

    def generate_point_inside_bounds bounds
      lat = bounds[:south] + rand * BOUNDS_SIZE
      lng = bounds[:west]  + rand * BOUNDS_SIZE

      {
        latitude:  lat,
        longitude: lng
      }
    end

    def generate_point_outside_bounds bounds
      lat = bounds[:south] - rand
      lng = bounds[:west]  - rand

      {
        latitude:  lat,
        longitude: lng
      }
    end
end
